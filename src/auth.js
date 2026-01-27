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
        this.isAuthenticated = false;
        this.userData = null;
    }
    
    /**
     * Обновляет accessToken через /api/v1/auth/refresh
     * ВАЖНО: обычно этот endpoint работает только при наличии refresh-cookie,
     * который браузер/сервер поставил ранее.
     *
     * @returns {Promise<string|null>} accessToken или null
     */
    async refreshAccessToken() {
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
                this.isAuthenticated = true;
                
                // Сохраняем токен в .env файл
                await saveAccessToken(newToken);
                
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
                            await saveCookieHeader(cookieHeader);
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
                console.error('refreshAccessToken failed:', error.response.status, error.response.data);
            } else {
                console.error('refreshAccessToken failed:', error.message);
            }
            return null;
        }
    }
    
    /**
     * Выход из аккаунта
     * 
     * @returns {Promise<boolean>} True если успешно
     */
    async logout() {
        try {
            const logoutUrl = `${this.client.baseUrl}/api/v1/auth/sign-out`;
            const response = await this.axios.post(logoutUrl);
            
            if (response.status === 200) {
                this.isAuthenticated = false;
                this.userData = null;
                this.client.setAccessToken(null);
                // Очистка cookies
                this.axios.defaults.headers.common['Cookie'] = '';
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
        // Проверяем наличие accessToken - если он есть, считаем что авторизован
        // Реальная проверка происходит на уровне API (401 ошибка)
        return !!(this.client.accessToken || this.isAuthenticated);
    }
}
