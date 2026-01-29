/**
 * Главный клиент для работы с неофициальным API итд.com
 */
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { AuthManager } from './auth.js';
import { PostsManager } from './posts.js';
import { CommentsManager } from './comments.js';
import { UsersManager } from './users.js';
import { NotificationsManager } from './notifications.js';
import { HashtagsManager } from './hashtags.js';
import { FilesManager } from './files.js';
import { ReportsManager } from './reports.js';
import { SearchManager } from './search.js';

dotenv.config();

export class ITDClient {
    /**
     * Инициализация клиента
     * 
     * @param {string|Object} baseUrlOrOptions - Базовый URL сайта или объект опций
     * @param {string} [userAgent] - User-Agent (если первый аргумент — baseUrl)
     * 
     * Опции (если первый аргумент — объект):
     * @param {string} [options.baseUrl] - Базовый URL сайта
     * @param {string} [options.userAgent] - User-Agent
     * @param {string} [options.projectRoot] - Корень проекта (по умолчанию process.cwd()); .env и .cookies ищутся здесь
     * @param {string} [options.envPath] - Полный путь к .env (переопределяет projectRoot для .env)
     * @param {string} [options.cookiesPath] - Полный путь к .cookies (переопределяет projectRoot для .cookies)
     * @param {number} [options.requestTimeout] - Таймаут обычных запросов в мс (по умолчанию 60000)
     * @param {number} [options.uploadTimeout] - Таймаут загрузки файлов и создания поста в мс (по умолчанию 120000)
     */
    constructor(baseUrlOrOptions = null, userAgent = null) {
        let baseUrl, projectRoot, envPath, cookiesPath, requestTimeout, uploadTimeout;

        if (baseUrlOrOptions && typeof baseUrlOrOptions === 'object' && !(baseUrlOrOptions instanceof URL)) {
            const opts = baseUrlOrOptions;
            baseUrl = opts.baseUrl ?? process.env.ITD_BASE_URL ?? 'https://xn--d1ah4a.com';
            userAgent = opts.userAgent ?? process.env.ITD_USER_AGENT ?? null;
            projectRoot = opts.projectRoot ?? process.cwd();
            envPath = opts.envPath ?? path.join(projectRoot, '.env');
            cookiesPath = opts.cookiesPath ?? path.join(projectRoot, '.cookies');
            requestTimeout = opts.requestTimeout ?? 60000;
            uploadTimeout = opts.uploadTimeout ?? 120000;
        } else {
            projectRoot = process.cwd();
            baseUrl = baseUrlOrOptions || process.env.ITD_BASE_URL || 'https://xn--d1ah4a.com';
            envPath = path.join(projectRoot, '.env');
            cookiesPath = path.join(projectRoot, '.cookies');
            requestTimeout = 60000;
            uploadTimeout = 120000;
        }

        // Используем реальный домен (IDN: итд.com = xn--d1ah4a.com)
        this.baseUrl = baseUrl;
        this.userAgent = userAgent || process.env.ITD_USER_AGENT ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        /** Пути к .env и .cookies (корень проекта по умолчанию) */
        this.envPath = envPath;
        this.cookiesPath = cookiesPath;

        /** Таймаут обычных запросов (мс). Для загрузки и создания поста используется uploadTimeout. */
        this.requestTimeout = requestTimeout;
        /** Таймаут загрузки файлов и создания поста (мс), чтобы не зависать при 504/медленной сети. */
        this.uploadTimeout = uploadTimeout;

        /** @type {string|null} */
        this.accessToken = null;

        // Прокси (важно, если браузер ходит через 127.0.0.1:10808)
        // Можно задать: ITD_PROXY=http://127.0.0.1:10808
        // Или стандартные: HTTPS_PROXY / HTTP_PROXY
        this.proxyUrl = process.env.ITD_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || null;
        
        // В Node.js axios НЕ хранит cookies сам по себе.
        // Поэтому используем CookieJar, чтобы сессия сохранялась как в браузере.
        this.cookieJar = new CookieJar();

        // Cookies загружаются из отдельного файла .cookies (чтобы избежать проблем с ; в .env)
        // ВАЖНО: это чувствительные данные — не коммитьте .cookies
        this._loadCookiesFromFile();

        // Создание axios instance + cookie jar
        const axiosConfig = {
            baseURL: this.baseUrl,
            timeout: requestTimeout,
            withCredentials: true,
            jar: this.cookieJar,
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                'Content-Type': 'application/json',
                // Возможно понадобятся дополнительные заголовки:
                // 'Referer': this.baseUrl,
                // 'Origin': this.baseUrl,
            }
        };

        if (this.proxyUrl) {
            // axios-cookiejar-support не работает с кастомными http(s).Agent,
            // поэтому используем встроенную поддержку proxy у axios.
            //
            // Формат: ITD_PROXY=http://127.0.0.1:10808
            // ВАЖНО: это должен быть HTTP CONNECT proxy, не SOCKS.
            const parsed = new URL(this.proxyUrl);
            axiosConfig.proxy = {
                protocol: parsed.protocol.replace(':', ''),
                host: parsed.hostname,
                port: parsed.port ? Number(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80),
            };
        }

        this.axios = wrapper(axios.create(axiosConfig));

        // Анти-дребезг для refresh (чтобы 10 параллельных 401 не делали 10 refresh)
        /** @type {Promise<string|null> | null} */
        this._refreshPromise = null;

        // Автоматически подставляем Authorization, если есть accessToken
        this.axios.interceptors.request.use((config) => {
            if (this.accessToken && !config.headers?.Authorization) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${this.accessToken}`;
            }
            return config;
        });

        // Авто-рефреш токена на 401 + повтор запроса
        this.axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const status = error?.response?.status;
                const originalRequest = error?.config;

                // Если нет конфига запроса — просто пробрасываем ошибку
                if (!originalRequest) {
                    throw error;
                }

                // Не пытаемся рефрешить при ошибках не-401
                // 429 (Rate Limit) тоже не рефрешим - это другая проблема
                if (status !== 401) {
                    throw error;
                }

                // Не зацикливаемся
                if (originalRequest.__itdRetried) {
                    throw error;
                }

                // Не пытаемся рефрешить, если это сам refresh
                const url = String(originalRequest.url || '');
                if (url.includes('/api/v1/auth/refresh')) {
                    throw error;
                }

                originalRequest.__itdRetried = true;

                // Пытаемся обновить токен (требует refresh_token cookie в cookie jar)
                if (!this._refreshPromise) {
                    this._refreshPromise = this.refreshAccessToken().finally(() => {
                        this._refreshPromise = null;
                    });
                }

                const newToken = await this._refreshPromise;

                if (!newToken) {
                    // Не смогли обновить — пробрасываем исходную 401
                    throw error;
                }

                // Повторяем исходный запрос с новым токеном
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                // Убираем флаг retry для следующей попытки
                delete originalRequest.__itdRetried;
                const retryResponse = await this.axios.request(originalRequest);
                return retryResponse;
            }
        );
        
        // Инициализация менеджеров
        this.auth = new AuthManager(this);
        this.posts = new PostsManager(this);
        this.comments = new CommentsManager(this);
        this.users = new UsersManager(this);
        this.notifications = new NotificationsManager(this);
        this.hashtags = new HashtagsManager(this);
        this.files = new FilesManager(this);
        this.reports = new ReportsManager(this);
        this.search = new SearchManager(this);
    }

    /**
     * Установить accessToken (JWT) для Authorization header
     * @param {string|null} token
     */
    setAccessToken(token) {
        this.accessToken = token || null;
    }
    
    /**
     * Загружает cookies из файла .cookies
     * @private
     */
    _loadCookiesFromFile() {
        try {
            if (!fs.existsSync(this.cookiesPath)) {
                // Файл не существует - это нормально, просто пропускаем
                return;
            }
            
            const cookieHeader = fs.readFileSync(this.cookiesPath, 'utf8').trim();
            if (!cookieHeader) {
                return;
            }
            
            // Парсим cookies
            const parts = cookieHeader.split(';').map((p) => p.trim()).filter(Boolean);
            const domain = new URL(this.baseUrl).hostname;
            
            for (const part of parts) {
                // part вида "name=value"
                const [name, ...valueParts] = part.split('=');
                if (name && valueParts.length > 0) {
                    const value = valueParts.join('='); // На случай если в value есть = 
                    // Создаем cookie с правильным форматом для tough-cookie
                    const cookieString = `${name}=${value}; Domain=${domain}; Path=/`;
                    this.cookieJar.setCookieSync(cookieString, this.baseUrl);
                }
            }
        } catch (e) {
            // Не валим процесс — просто предупреждаем в консоль
            console.warn('⚠️  Не удалось загрузить cookies из .cookies:', e?.message || e);
        }
    }
    

    /**
     * Обновить accessToken через refresh endpoint.
     * Обычно работает, если в cookie jar уже есть refresh-cookie от сайта.
     * @returns {Promise<string|null>} accessToken или null
     */
    async refreshAccessToken() {
        return await this.auth.refreshAccessToken();
    }
    
    /**
     * Проверяет наличие refresh_token в cookies
     * 
     * @returns {boolean} True если refresh_token доступен для обновления токена
     */
    hasRefreshToken() {
        return this.auth.hasRefreshToken();
    }
    
    /**
     * Проверяет валидность токена и обновляет его при необходимости
     * Полезно вызывать перед множественными запросами с большими интервалами
     * 
     * @returns {Promise<boolean>} True если токен валиден или успешно обновлен
     */
    async validateAndRefreshToken() {
        return await this.auth.validateAndRefreshToken();
    }
    
    /**
     * Выход из аккаунта
     * 
     * @returns {Promise<boolean>} True если успешно
     */
    async logout() {
        return await this.auth.logout();
    }
    
    /**
     * Создает пост (удобный метод)
     * 
     * @param {string} text - Текст поста
     * @param {string|null} imagePath - Путь к изображению (опционально)
     * @returns {Promise<Object|null>} Данные поста или null
     */
    async createPost(text, imagePath = null) {
        return await this.posts.createPost(text, imagePath);
    }
    
    /**
     * Создает пост на стене другого пользователя (wall post)
     * 
     * @param {string} username - Имя пользователя, на чью стену нужно написать
     * @param {string} text - Текст поста
     * @param {string|null} imagePath - Путь к изображению (опционально)
     * @returns {Promise<Object|null>} Данные созданного поста или null
     */
    async createWallPost(username, text, imagePath = null) {
        return await this.posts.createWallPost(username, text, imagePath);
    }
    
    /**
     * Редактирует пост (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @param {string} newContent - Новый текст поста
     * @returns {Promise<Object|null>} Обновленные данные поста или null
     */
    async editPost(postId, newContent) {
        return await this.posts.editPost(postId, newContent);
    }
    
    /**
     * Получает список постов пользователя или ленту
     * 
     * @param {string|null} username - Имя пользователя (null = лента/свои посты)
     * @param {number} limit - Количество постов
     * @param {string} sort - Сортировка: "new", "old", "popular"
     * @param {string|null} cursor - Курсор для пагинации
     * @param {string|null} tab - Тип ленты: "popular" (популярные), "following" (из подписок), null (обычная лента)
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getPosts(username = null, limit = 20, sort = 'new', cursor = null, tab = null) {
        return await this.posts.getPosts(username, limit, sort, cursor, tab);
    }
    
    /**
     * Получает популярные посты (лента популярного)
     * 
     * @param {number} limit - Количество постов
     * @param {string|null} cursor - Курсор для пагинации
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getFeedPopular(limit = 20, cursor = null) {
        return await this.posts.getFeedPopular(limit, cursor);
    }
    
    /**
     * Получает посты из подписок (лента подписок)
     * 
     * @param {number} limit - Количество постов
     * @param {string|null} cursor - Курсор для пагинации
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getFeedFollowing(limit = 20, cursor = null) {
        return await this.posts.getFeedFollowing(limit, cursor);
    }
    
    /**
     * Получает список постов (простой вариант - только массив)
     * 
     * @param {string|null} username - Имя пользователя
     * @param {number} limit - Количество постов
     * @returns {Promise<Array>} Список постов
     */
    async getPostsList(username = null, limit = 20) {
        const result = await this.posts.getPosts(username, limit, 'new', null);
        return result.posts;
    }
    
    /**
     * Получает конкретный пост по ID
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<Object|null>} Данные поста или null
     */
    async getPost(postId) {
        return await this.posts.getPost(postId);
    }
    
    /**
     * Удаляет пост (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<boolean>} True если успешно
     */
    async deletePost(postId) {
        return await this.posts.deletePost(postId);
    }
    
    /**
     * Закрепляет пост (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<boolean>} True если успешно
     */
    async pinPost(postId) {
        return await this.posts.pinPost(postId);
    }
    
    /**
     * Делает репост (удобный метод)
     * 
     * @param {string} postId - ID поста для репоста
     * @param {string|null} comment - Комментарий к репосту (опционально)
     * @returns {Promise<Object|null>} Данные созданного репоста или null
     */
    async repost(postId, comment = null) {
        return await this.posts.repost(postId, comment);
    }
    
    /**
     * Ставит лайк на пост
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<Object|null>} { liked: true, likesCount: number } или null при ошибке
     */
    async likePost(postId) {
        if (!await this.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        
        try {
            const likeUrl = `${this.baseUrl}/api/posts/${postId}/like`;
            const response = await this.axios.post(likeUrl);
            
            if (response.status === 200 || response.status === 201) {
                return response.data; // { liked: true, likesCount: number }
            } else {
                console.error(`Ошибка лайка: ${response.status} - ${JSON.stringify(response.data)}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при лайке:', error.message);
            if (error.response) {
                console.error('Response:', error.response.status, error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Убирает лайк с поста
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<Object|null>} { liked: false, likesCount: number } или null при ошибке
     */
    async unlikePost(postId) {
        if (!await this.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        
        try {
            const unlikeUrl = `${this.baseUrl}/api/posts/${postId}/like`;
            const response = await this.axios.delete(unlikeUrl);
            
            if (response.status === 200 || response.status === 204) {
                return response.data || { liked: false, likesCount: 0 };
            } else {
                console.error(`Ошибка убирания лайка: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Исключение при убирании лайка:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Добавляет комментарий к посту
     * 
     * @param {string} postId - ID поста
     * @param {string} text - Текст комментария
     * @param {string|null} replyToCommentId - ID комментария для ответа (опционально)
     * @returns {Promise<Object|null>} Данные комментария
     */
    async addComment(postId, text, replyToCommentId = null) {
        return await this.comments.addComment(postId, text, replyToCommentId);
    }

    /**
     * Ответ на комментарий (POST /api/comments/:id/replies).
     *
     * @param {string} commentId - ID комментария, на который отвечаем
     * @param {string} content - Текст ответа
     * @param {string} replyToUserId - ID пользователя-автора комментария (обязательно для API)
     * @returns {Promise<Object|null>} Данные созданного комментария-ответа или null при ошибке
     */
    async replyToComment(commentId, content, replyToUserId) {
        return await this.comments.replyToComment(commentId, content, replyToUserId);
    }
    
    /**
     * Ставит лайк на комментарий
     * 
     * @param {string} commentId - ID комментария
     * @returns {Promise<Object|null>} { liked: true, likesCount: number } или null при ошибке
     */
    async likeComment(commentId) {
        return await this.comments.likeComment(commentId);
    }
    
    /**
     * Убирает лайк с комментария
     * 
     * @param {string} commentId - ID комментария
     * @returns {Promise<Object|null>} { liked: false, likesCount: number } или null при ошибке
     */
    async unlikeComment(commentId) {
        return await this.comments.unlikeComment(commentId);
    }
    
    /**
     * Удаляет комментарий
     * 
     * @param {string} commentId - ID комментария
     * @returns {Promise<boolean>} True если успешно
     */
    async deleteComment(commentId) {
        return await this.comments.deleteComment(commentId);
    }
    
    /**
     * Получает комментарии к посту
     * 
     * @param {string} postId - ID поста
     * @param {number} limit - Количество комментариев
     * @param {string} sort - Сортировка: "popular", "new", "old"
     * @returns {Promise<Object>} { comments: [], total, hasMore, nextCursor }
     */
    async getComments(postId, limit = 20, sort = 'popular') {
        return await this.comments.getComments(postId, limit, sort);
    }
    
    /**
     * Обновляет описание профиля текущего пользователя
     * 
     * @param {string} bio - Новое описание профиля
     * @param {string|null} displayName - Новое отображаемое имя (опционально)
     * @returns {Promise<Object|null>} Обновленные данные профиля или null при ошибке
     */
    async updateProfile(bio, displayName = null) {
        return await this.users.updateProfile(bio, displayName);
    }
    
    /**
     * Получает данные текущего пользователя
     * 
     * @returns {Promise<Object|null>} Данные профиля или null при ошибке
     */
    async getMyProfile() {
        return await this.users.getMyProfile();
    }
    
    /**
     * Получает профиль пользователя по username
     * 
     * @param {string} username - Имя пользователя
     * @returns {Promise<Object|null>} Данные профиля или null при ошибке
     */
    async getUserProfile(username) {
        return await this.users.getUserProfile(username);
    }
    
    /**
     * Подписывается на пользователя
     * 
     * @param {string} username - Имя пользователя
     * @returns {Promise<Object|null>} { following: true, followersCount: number } или null при ошибке
     */
    async followUser(username) {
        return await this.users.followUser(username);
    }
    
    /**
     * Отписывается от пользователя
     * 
     * @param {string} username - Имя пользователя
     * @returns {Promise<Object|null>} { following: false, followersCount: number } или null при ошибке
     */
    async unfollowUser(username) {
        return await this.users.unfollowUser(username);
    }
    
    /**
     * Получает список подписчиков пользователя
     * 
     * @param {string} username - Имя пользователя
     * @param {number} page - Номер страницы (начиная с 1)
     * @param {number} limit - Количество на странице
     * @returns {Promise<Object|null>} { users: [], pagination: {} } или null
     */
    async getFollowers(username, page = 1, limit = 30) {
        return await this.users.getFollowers(username, page, limit);
    }
    
    /**
     * Получает список подписок пользователя
     * 
     * @param {string} username - Имя пользователя
     * @param {number} page - Номер страницы (начиная с 1)
     * @param {number} limit - Количество на странице
     * @returns {Promise<Object|null>} { users: [], pagination: {} } или null
     */
    async getFollowing(username, page = 1, limit = 30) {
        return await this.users.getFollowing(username, page, limit);
    }
    
    /**
     * Получает клан пользователя (эмодзи из avatar)
     * 
     * @param {string} username - Имя пользователя
     * @returns {Promise<string|null>} Эмодзи клана или null
     */
    async getUserClan(username) {
        return await this.users.getUserClan(username);
    }
    
    /**
     * Получает список уведомлений
     * 
     * @param {number} limit - Количество уведомлений
     * @param {string|null} cursor - Курсор для пагинации
     * @param {string|null} type - Фильтр по типу: 'reply', 'like', 'wall_post', 'follow', 'comment' (опционально)
     * @returns {Promise<Object|null>} { notifications: [], pagination: {} } или null
     */
    async getNotifications(limit = 20, cursor = null, type = null) {
        return await this.notifications.getNotifications(limit, cursor, type);
    }
    
    /**
     * Получает уведомления определенного типа
     * 
     * @param {string} type - Тип уведомления: 'reply', 'like', 'wall_post', 'follow', 'comment'
     * @param {number} limit - Количество уведомлений (по умолчанию 20)
     * @param {string|null} cursor - Курсор для пагинации
     * @returns {Promise<Object|null>} { notifications: [], pagination: {} } или null
     */
    async getNotificationsByType(type, limit = 20, cursor = null) {
        return await this.notifications.getNotifications(limit, cursor, type);
    }
    
    /**
     * Отмечает уведомление как прочитанное
     * 
     * @param {string} notificationId - ID уведомления
     * @returns {Promise<Object|null>} { success: true } или null при ошибке
     */
    async markNotificationAsRead(notificationId) {
        return await this.notifications.markAsRead(notificationId);
    }
    
    /**
     * Отмечает все уведомления как прочитанные
     * 
     * @returns {Promise<boolean>} True если успешно
     */
    async markAllNotificationsAsRead() {
        return await this.notifications.markAllAsRead();
    }
    
    /**
     * Получает количество непрочитанных уведомлений
     * 
     * @returns {Promise<number|null>} Количество уведомлений или null при ошибке
     */
    async getNotificationCount() {
        return await this.notifications.getUnreadCount();
    }
    
    /**
     * Получает трендовые хэштеги
     * 
     * @param {number} limit - Количество хэштегов (по умолчанию 10)
     * @returns {Promise<Object|null>} { hashtags: [] } или null при ошибке
     */
    async getTrendingHashtags(limit = 10) {
        return await this.hashtags.getTrending(limit);
    }
    
    /**
     * Получает посты по хэштегу
     * 
     * @param {string} hashtagName - Имя хэштега (без #)
     * @param {number} limit - Количество постов (по умолчанию 20)
     * @param {string|null} cursor - Курсор для пагинации
     * @returns {Promise<Object|null>} { posts: [], hashtag: {}, pagination: {} } или null при ошибке
     */
    async getPostsByHashtag(hashtagName, limit = 20, cursor = null) {
        return await this.hashtags.getPostsByHashtag(hashtagName, limit, cursor);
    }
    
    /**
     * Получает топ кланов по количеству участников
     * 
     * @returns {Promise<Array|null>} Массив кланов [{ avatar: "🦎", memberCount: 3794 }, ...] или null при ошибке
     */
    async getTopClans() {
        return await this.users.getTopClans();
    }
    
    /**
     * Получает рекомендации кого подписаться
     * 
     * @returns {Promise<Array|null>} Массив пользователей или null при ошибке
     */
    async getWhoToFollow() {
        return await this.users.getWhoToFollow();
    }
    
    /**
     * Загружает файл (изображение) на сервер
     * 
     * @param {string} filePath - Путь к файлу
     * @returns {Promise<Object|null>} { id, url, filename, mimeType, size } или null при ошибке
     */
    async uploadFile(filePath) {
        return await this.files.uploadFile(filePath);
    }
    
    /**
     * Отправляет репорт на пост, комментарий или пользователя
     * 
     * @param {string} targetType - Тип цели: "post", "comment", "user"
     * @param {string} targetId - ID цели
     * @param {string} reason - Причина репорта (по умолчанию "other")
     * @param {string} description - Описание проблемы
     * @returns {Promise<Object|null>} { id, createdAt } или null при ошибке
     */
    async report(targetType, targetId, reason = 'other', description = '') {
        return await this.reports.report(targetType, targetId, reason, description);
    }
    
    /**
     * Отправляет репорт на пост
     * 
     * @param {string} postId - ID поста
     * @param {string} reason - Причина репорта (по умолчанию "other")
     * @param {string} description - Описание проблемы
     * @returns {Promise<Object|null>} { id, createdAt } или null при ошибке
     */
    async reportPost(postId, reason = 'other', description = '') {
        return await this.reports.reportPost(postId, reason, description);
    }
    
    /**
     * Отправляет репорт на комментарий
     * 
     * @param {string} commentId - ID комментария
     * @param {string} reason - Причина репорта (по умолчанию "other")
     * @param {string} description - Описание проблемы
     * @returns {Promise<Object|null>} { id, createdAt } или null при ошибке
     */
    async reportComment(commentId, reason = 'other', description = '') {
        return await this.reports.reportComment(commentId, reason, description);
    }
    
    /**
     * Отправляет репорт на пользователя
     * 
     * @param {string} userId - ID пользователя
     * @param {string} reason - Причина репорта (по умолчанию "other")
     * @param {string} description - Описание проблемы
     * @returns {Promise<Object|null>} { id, createdAt } или null при ошибке
     */
    async reportUser(userId, reason = 'other', description = '') {
        return await this.reports.reportUser(userId, reason, description);
    }
    
    /**
     * Выполняет поиск пользователей и хэштегов
     * 
     * @param {string} query - Поисковый запрос
     * @param {number} userLimit - Максимальное количество пользователей (по умолчанию 5)
     * @param {number} hashtagLimit - Максимальное количество хэштегов (по умолчанию 5)
     * @returns {Promise<Object|null>} { users: [], hashtags: [] } или null при ошибке
     */
    async search(query, userLimit = 5, hashtagLimit = 5) {
        return await this.search.search(query, userLimit, hashtagLimit);
    }
    
    /**
     * Ищет пользователей
     * 
     * @param {string} query - Поисковый запрос
     * @param {number} limit - Максимальное количество пользователей (по умолчанию 5)
     * @returns {Promise<Array|null>} Массив пользователей или null при ошибке
     */
    async searchUsers(query, limit = 5) {
        return await this.search.searchUsers(query, limit);
    }
    
    /**
     * Ищет хэштеги
     * 
     * @param {string} query - Поисковый запрос
     * @param {number} limit - Максимальное количество хэштегов (по умолчанию 5)
     * @returns {Promise<Array|null>} Массив хэштегов или null при ошибке
     */
    async searchHashtags(query, limit = 5) {
        return await this.search.searchHashtags(query, limit);
    }
    
    // ========== USER-FRIENDLY МЕТОДЫ ==========
    
    // === Посты ===
    
    /**
     * Получает трендовые посты (удобный метод)
     * 
     * @param {number} limit - Количество постов (по умолчанию 20)
     * @param {string|null} cursor - Курсор для пагинации
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getTrendingPosts(limit = 20, cursor = null) {
        return await this.posts.getTrendingPosts(limit, cursor);
    }
    
    /**
     * Получает недавние посты (удобный метод)
     * 
     * @param {number} limit - Количество постов (по умолчанию 20)
     * @param {string|null} cursor - Курсор для пагинации
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getRecentPosts(limit = 20, cursor = null) {
        return await this.posts.getRecentPosts(limit, cursor);
    }
    
    /**
     * Получает свои посты (удобный метод)
     * 
     * @param {number} limit - Количество постов (по умолчанию 20)
     * @param {string} sort - Сортировка: 'new', 'old', 'popular' (по умолчанию 'new')
     * @param {string|null} cursor - Курсор для пагинации
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getMyPosts(limit = 20, sort = 'new', cursor = null) {
        return await this.posts.getMyPosts(limit, sort, cursor);
    }
    
    /**
     * Получает последний пост пользователя (удобный метод)
     * 
     * @param {string} username - Имя пользователя
     * @returns {Promise<Object|null>} Последний пост или null
     */
    async getUserLatestPost(username) {
        return await this.posts.getUserLatestPost(username);
    }
    
    /**
     * Получает количество лайков поста (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<number>} Количество лайков
     */
    async getPostLikesCount(postId) {
        return await this.posts.getPostLikesCount(postId);
    }
    
    /**
     * Получает количество просмотров поста (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<number>} Количество просмотров
     */
    async getPostViewsCount(postId) {
        return await this.posts.getPostViewsCount(postId);
    }
    
    /**
     * Получает количество комментариев поста (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<number>} Количество комментариев
     */
    async getPostCommentsCount(postId) {
        return await this.posts.getPostCommentsCount(postId);
    }
    
    /**
     * Получает статистику поста (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<Object|null>} { likes: number, views: number, comments: number, reposts: number } или null
     */
    async getPostStats(postId) {
        return await this.posts.getPostStats(postId);
    }
    
    // === Пользователи ===
    
    /**
     * Получает свой профиль (удобный метод)
     * 
     * @returns {Promise<Object|null>} Данные профиля или null
     */
    async getMyProfile() {
        return await this.users.getMyProfile();
    }
    
    /**
     * Проверяет, подписан ли текущий пользователь на указанного (удобный метод)
     * 
     * @param {string} username - Имя пользователя для проверки
     * @returns {Promise<boolean>} True если подписан, false если нет или ошибка
     */
    async isFollowing(username) {
        return await this.users.isFollowing(username);
    }
    
    /**
     * Получает количество своих подписчиков (удобный метод)
     * 
     * @returns {Promise<number>} Количество подписчиков
     */
    async getMyFollowersCount() {
        return await this.users.getMyFollowersCount();
    }
    
    /**
     * Получает количество своих подписок (удобный метод)
     * 
     * @returns {Promise<number>} Количество подписок
     */
    async getMyFollowingCount() {
        return await this.users.getMyFollowingCount();
    }
    
    /**
     * Получает свой клан (эмодзи аватара) (удобный метод)
     * 
     * @returns {Promise<string|null>} Эмодзи клана или null
     */
    async getMyClan() {
        return await this.users.getMyClan();
    }
    
    /**
     * Получает клан пользователя (эмодзи аватара) (удобный метод)
     * 
     * @param {string} username - Имя пользователя
     * @returns {Promise<string|null>} Эмодзи клана или null
     */
    async getUserClan(username) {
        return await this.users.getUserClan(username);
    }
    
    // === Комментарии ===
    
    /**
     * Получает топ-комментарий поста (с наибольшим количеством лайков) (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<Object|null>} Топ-комментарий или null
     */
    async getTopComment(postId) {
        return await this.comments.getTopComment(postId);
    }
    
    /**
     * Проверяет, есть ли комментарии у поста (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<boolean>} True если есть комментарии
     */
    async hasComments(postId) {
        return await this.comments.hasComments(postId);
    }
    
    // === Уведомления ===
    
    /**
     * Проверяет, есть ли непрочитанные уведомления (удобный метод)
     * 
     * @returns {Promise<boolean>} True если есть непрочитанные
     */
    async hasUnreadNotifications() {
        return await this.notifications.hasUnreadNotifications();
    }
    
    /**
     * Получает только непрочитанные уведомления (удобный метод)
     * 
     * @param {number} limit - Количество уведомлений
     * @param {string|null} cursor - Курсор для пагинации
     * @returns {Promise<Object|null>} { notifications: [], pagination: {} } или null
     */
    async getUnreadNotifications(limit = 20, cursor = null) {
        return await this.notifications.getUnreadNotifications(limit, cursor);
    }
}
