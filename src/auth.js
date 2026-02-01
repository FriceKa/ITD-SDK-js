/**
 * Модуль аутентификации
 */
import { saveAccessToken, saveCookieHeader } from './token-storage.js';

export class AuthManager {
    /**
     * Управление аутентификацией
     * 
     * @param {ITDClient} client - Главный клиент
     */
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }
    
    /**
     * Проверяет наличие refresh_token в cookies
     * 
     * @returns {boolean} True если refresh_token доступен
     */
    hasRefreshToken() {
        try {
            const cookies = this.client.cookieJar.getCookiesSync(this.client.baseUrl);
            return cookies.some(c => c.key === 'refresh_token');
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Обновляет accessToken через /api/v1/auth/refresh
     * ВАЖНО: обычно этот endpoint работает только при наличии refresh-cookie,
     * который браузер/сервер поставил ранее.
     *
     * @returns {Promise<string|null>} accessToken или null
     */
    async refreshAccessToken() {
        // Проверяем наличие refresh_token перед попыткой обновления
        if (!this.hasRefreshToken()) {
            console.error('❌ Не удалось обновить токен: refresh_token не найден в cookies');
            console.error('💡 Решение:');
            console.error('   1. Откройте итд.com в браузере и войдите в аккаунт');
            console.error('   2. Откройте DevTools (F12) → Network');
            console.error('   3. Найдите любой запрос к итд.com');
            console.error('   4. Скопируйте значение заголовка Cookie');
            console.error('   5. Вставьте в файл .cookies в корне проекта');
            console.error('   6. Убедитесь, что в Cookie есть refresh_token');
            return null;
        }
        
        try {
            const refreshUrl = `${this.client.baseUrl}/api/v1/auth/refresh`;

            const headers = {
                'Referer': `${this.client.baseUrl}/`,
                'Origin': this.client.baseUrl,
            };

            const response = await this.axios.post(refreshUrl, {}, { headers });

            if (response.status === 200 && response.data?.accessToken) {
                const newToken = response.data.accessToken;
                
                // Обновляем токен в клиенте
                this.client.setAccessToken(newToken);
                
                // Сохраняем токен в .env файл (в корне проекта)
                await saveAccessToken(newToken, this.client.envPath);
                
                // Обновляем cookies, если они пришли в ответе
                if (response.headers['set-cookie']) {
                    const cookies = response.headers['set-cookie'];
                    // Обновляем CookieJar с новыми cookies
                    for (const cookieString of cookies) {
                        try {
                            this.client.cookieJar.setCookieSync(cookieString, this.client.baseUrl);
                        } catch (e) {
                            // Игнорируем ошибки парсинга отдельных cookies
                        }
                    }
                    
                    // Получаем все cookies из jar и обновляем .cookies файл
                    try {
                        const allCookies = await this.client.cookieJar.getCookiesSync(this.client.baseUrl);
                        // Сохраняем только важные cookies (refresh_token и другие auth cookies)
                        const importantCookies = allCookies.filter(c => 
                            c.key === 'refresh_token' || 
                            c.key.startsWith('__ddg') || 
                            c.key === 'is_auth'
                        );
                        if (importantCookies.length > 0) {
                            const cookieHeader = importantCookies.map(c => `${c.key}=${c.value}`).join('; ');
                            await saveCookieHeader(cookieHeader, this.client.cookiesPath);
                        }
                    } catch (e) {
                        console.warn('⚠️  Не удалось сохранить обновленные cookies:', e.message);
                    }
                }
                
                return newToken;
            }

            return null;
        } catch (error) {
            if (error.response) {
                const errorData = error.response.data;
                if (errorData?.error?.code === 'REFRESH_TOKEN_MISSING') {
                    console.error('❌ Не удалось обновить токен: refresh_token не найден');
                    console.error('💡 Решение: обновите файл .cookies из браузера (см. инструкцию выше)');
                } else {
                    console.error('refreshAccessToken failed:', error.response.status, error.response.data);
                }
            } else {
                console.error('refreshAccessToken failed:', error.message);
            }
            return null;
        }
    }
    
    /**
     * Смена пароля. POST /api/v1/auth/change-password
     * Требует cookies (refresh_token).
     *
     * @param {string} oldPassword - Текущий пароль
     * @param {string} newPassword - Новый пароль
     * @returns {Promise<Object|null>} Ответ API или null при ошибке
     */
    async changePassword(oldPassword, newPassword) {
        if (!await this.client.requireAuth()) {
            console.error('Ошибка: необходим accessToken');
            return null;
        }
        if (!this.hasRefreshToken()) {
            console.error('Ошибка: необходим refresh_token в cookies');
            return null;
        }
        try {
            const url = `${this.client.baseUrl}/api/v1/auth/change-password`;
            const response = await this.axios.post(url, {
                oldPassword,
                newPassword,
            });
            if (response.status === 200) {
                return response.data;
            }
            return null;
        } catch (error) {
            console.error('Ошибка смены пароля:', error.message);
            if (error.response) {
                console.error('Response:', error.response.status, error.response.data);
            }
            return null;
        }
    }

    /**
     * Выход из аккаунта.
     * POST /api/v1/auth/logout → 204
     *
     * @returns {Promise<boolean>} True если успешно
     */
    async logout() {
        try {
            const logoutUrl = `${this.client.baseUrl}/api/v1/auth/logout`;
            const response = await this.axios.post(logoutUrl);

            if (response.status === 200 || response.status === 204) {
                this.client.setAccessToken(null);
                try {
                    this.client.cookieJar.removeAllCookiesSync();
                } catch (e) {
                    // MemoryCookieStore поддерживает removeAllCookiesSync
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Ошибка выхода:', error.message);
            return false;
        }
    }
    
    /**
     * Проверяет, авторизован ли пользователь
     * 
     * @returns {Promise<boolean>} True если авторизован
     */
    async checkAuth() {
        // Авторизован, если есть accessToken (реальная проверка — 401 при истечении)
        return !!this.client.accessToken;
    }
    
    /**
     * Проверяет валидность токена, делая тестовый запрос
     * Если токен истек и есть refresh_token, автоматически обновляет его
     * 
     * @returns {Promise<boolean>} True если токен валиден или успешно обновлен
     */
    async validateAndRefreshToken() {
        if (!this.client.accessToken) {
            return false;
        }
        
        try {
            // Делаем легкий запрос для проверки токена
            const profileUrl = `${this.client.baseUrl}/api/users/me`;
            const response = await this.client.axios.get(profileUrl);
            
            if (response.status === 200) {
                return true; // Токен валиден
            }
            
            return false;
        } catch (error) {
            // Если получили 401, пытаемся обновить токен
            if (error.response?.status === 401) {
                const newToken = await this.refreshAccessToken();
                return !!newToken;
            }
            
            return false;
        }
    }
}
