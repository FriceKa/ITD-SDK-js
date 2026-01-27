/**
 * Модуль работы с постами
 */
import fs from 'fs';
import FormData from 'form-data';

export class PostsManager {
    /**
     * Управление постами
     * 
     * @param {ITDClient} client - Главный клиент
     */
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }
    
    /**
     * Создает новый пост
     * 
     * @param {string} text - Текст поста
     * @param {string|null} imagePath - Путь к изображению (опционально)
     * @returns {Promise<Object|null>} Данные созданного поста или null при ошибке
     */
    async createPost(text, imagePath = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        
        try {
            // Реальный URL из анализа
            const postUrl = `${this.client.baseUrl}/api/posts`;
            
            // Подготовка данных (реальная структура из анализа)
            let postData = {
                content: text,  // Реальное поле называется "content"
            };
            
            // Если есть изображение
            if (imagePath) {
                // Сначала загружаем файл через /api/files/upload
                const uploadedFile = await this.client.files.uploadFile(imagePath);
                if (!uploadedFile) {
                    console.error('Ошибка: не удалось загрузить изображение');
                    return null;
                }
                
                // Затем создаем пост с ID загруженного файла
                postData.attachments = [uploadedFile.id];
            }
            
            // Создаем пост (с изображением или без)
            const response = await this.axios.post(postUrl, postData);
            
            if (response.status === 200 || response.status === 201) {
                return response.data;
            } else {
                console.error(`Ошибка создания поста: ${response.status} - ${JSON.stringify(response.data)}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при создании поста:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Получает список постов пользователя или ленту
     * 
     * @param {string|null} username - Имя пользователя (null = лента/свои посты)
     * @param {number} limit - Количество постов
     * @param {string} sort - Сортировка: "new" (новые), "old" (старые), "popular" (популярные), "trending" (трендовые, аналог popular), "recent" (недавние, аналог new)
     * @param {string|null} cursor - Курсор для пагинации (из pagination.nextCursor)
     * @param {string|null} tab - Тип ленты: "popular" (популярные), "following" (из подписок), null (обычная лента)
     * @param {string|null} type - Альтернативный способ указать тип: "trending" (аналог tab=popular)
     * @param {string|null} filter - Альтернативный способ указать фильтр: "trending" (аналог tab=popular)
     * @returns {Promise<Object>} Объект с постами и пагинацией: { posts: [], pagination: {} }
     * 
     * @note Параметры type и filter являются альтернативными способами получить те же данные,
     *       что и tab/sort. Они добавлены для совместимости с различными вариантами API.
     */
    async getPosts(username = null, limit = 20, sort = 'new', cursor = null, tab = null, type = null, filter = null) {
        // Если username не указан и tab указан, запрашиваем ленту - требуется авторизация
        if (!username && (tab || type || filter) && !await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт для получения ленты');
            return { posts: [], pagination: {} };
        }
        
        try {
            let postsUrl;
            const params = {
                limit: limit,
            };
            
            if (username) {
                // Посты конкретного пользователя (публичные, auth не требуется)
                postsUrl = `${this.client.baseUrl}/api/posts/user/${username}`;
                params.sort = sort;
            } else {
                // Лента (популярные, из подписок, или обычная)
                postsUrl = `${this.client.baseUrl}/api/posts`;
                
                // Приоритет: tab > type > filter > sort
                if (tab) {
                    params.tab = tab; // "popular" или "following"
                } else if (type) {
                    params.type = type; // "trending" (аналог tab=popular)
                } else if (filter) {
                    params.filter = filter; // "trending" (аналог tab=popular)
                } else {
                    params.sort = sort; // "new", "old", "popular", "trending", "recent"
                }
            }
            
            if (cursor) {
                params.cursor = cursor;
            }
            
            const response = await this.axios.get(postsUrl, { params });
            
            if (response.status === 200) {
                const data = response.data;
                
                // Реальная структура: { data: { posts: [...], pagination: {...} } }
                if (data.data && data.data.posts) {
                    return {
                        posts: data.data.posts,
                        pagination: data.data.pagination || {}
                    };
                }
                
                // Fallback для других возможных структур
                if (Array.isArray(data)) {
                    return { posts: data, pagination: {} };
                } else if (data.posts && Array.isArray(data.posts)) {
                    return { posts: data.posts, pagination: data.pagination || {} };
                }
                
                return { posts: [], pagination: {} };
            } else {
                console.error(`Ошибка получения постов: ${response.status}`);
                return { posts: [], pagination: {} };
            }
        } catch (error) {
            console.error('Исключение при получении постов:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return { posts: [], pagination: {} };
        }
    }
    
    /**
     * Получает популярные посты (лента популярного)
     * 
     * @param {number} limit - Количество постов
     * @param {string|null} cursor - Курсор для пагинации
     * @returns {Promise<Object>} Объект с постами и пагинацией: { posts: [], pagination: {} }
     */
    async getFeedPopular(limit = 20, cursor = null) {
        return await this.getPosts(null, limit, 'new', cursor, 'popular');
    }
    
    /**
     * Получает посты из подписок (лента подписок)
     * 
     * @param {number} limit - Количество постов
     * @param {string|null} cursor - Курсор для пагинации
     * @returns {Promise<Object>} Объект с постами и пагинацией: { posts: [], pagination: {} }
     */
    async getFeedFollowing(limit = 20, cursor = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт для получения ленты подписок');
            return { posts: [], pagination: {} };
        }
        return await this.getPosts(null, limit, 'new', cursor, 'following');
    }
    
    
    /**
     * Получает конкретный пост по ID
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<Object|null>} Данные поста или null
     * 
     * Примечание: Авторизация не требуется для просмотра публичных постов
     */
    async getPost(postId) {
        try {
            // Реальный URL из анализа
            const postUrl = `${this.client.baseUrl}/api/posts/${postId}`;
            const response = await this.axios.get(postUrl);
            
            if (response.status === 200) {
                // Структура ответа: { data: { id, content, comments: [...], ... } }
                const post = response.data.data || response.data;
                // Комментарии могут быть вложены в пост
                return post;
            } else {
                console.error(`Ошибка получения поста: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при получении поста:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Редактирует существующий пост
     * 
     * @param {string} postId - ID поста
     * @param {string} newContent - Новый текст поста
     * @returns {Promise<Object|null>} Обновленные данные поста или null
     */
    async editPost(postId, newContent) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        
        try {
            // Реальный URL из анализа: PUT /api/posts/{id}
            const editUrl = `${this.client.baseUrl}/api/posts/${postId}`;
            
            const postData = {
                content: newContent,  // Реальное поле называется "content"
            };
            
            const response = await this.axios.put(editUrl, postData);
            
            if (response.status === 200) {
                return response.data;
            } else {
                console.error(`Ошибка редактирования поста: ${response.status} - ${JSON.stringify(response.data)}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при редактировании поста:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Удаляет пост
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<boolean>} True если успешно
     */
    async deletePost(postId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return false;
        }
        
        try {
            // Реальный URL из анализа
            const deleteUrl = `${this.client.baseUrl}/api/posts/${postId}`;
            const response = await this.axios.delete(deleteUrl);
            
            if (response.status === 200 || response.status === 204) {
                return true;
            } else {
                console.error(`Ошибка удаления поста: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return false;
            }
        } catch (error) {
            console.error('Исключение при удалении поста:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return false;
        }
    }
    
    /**
     * Закрепляет пост
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<boolean>} True если успешно
     */
    async pinPost(postId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return false;
        }
        
        try {
            const pinUrl = `${this.client.baseUrl}/api/posts/${postId}/pin`;
            const response = await this.axios.post(pinUrl);
            
            if (response.status === 200 || response.status === 201) {
                return true;
            } else {
                console.error(`Ошибка закрепления поста: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return false;
            }
        } catch (error) {
            console.error('Исключение при закреплении поста:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return false;
        }
    }
    
    /**
     * Делает репост
     * 
     * @param {string} postId - ID поста для репоста
     * @param {string|null} comment - Комментарий к репосту (опционально)
     * @returns {Promise<Object|null>} Данные созданного репоста или null при ошибке
     */
    async repost(postId, comment = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        
        try {
            const repostUrl = `${this.client.baseUrl}/api/posts/${postId}/repost`;
            
            const repostData = {};
            if (comment !== null && comment !== undefined && comment !== '') {
                repostData.content = comment;
            }
            
            const response = await this.axios.post(repostUrl, repostData);
            
            if (response.status === 200 || response.status === 201) {
                return response.data;
            } else {
                console.error(`Ошибка репоста: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Исключение при репосте:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    // ========== USER-FRIENDLY МЕТОДЫ ==========
    
    /**
     * Получает трендовые посты (удобный метод)
     * 
     * @param {number} limit - Количество постов (по умолчанию 20)
     * @param {string|null} cursor - Курсор для пагинации
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getTrendingPosts(limit = 20, cursor = null) {
        return await this.getPosts(null, limit, 'trending', cursor);
    }
    
    /**
     * Получает недавние посты (удобный метод)
     * 
     * @param {number} limit - Количество постов (по умолчанию 20)
     * @param {string|null} cursor - Курсор для пагинации
     * @returns {Promise<Object>} { posts: [], pagination: {} }
     */
    async getRecentPosts(limit = 20, cursor = null) {
        return await this.getPosts(null, limit, 'recent', cursor);
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
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт для получения своих постов');
            return { posts: [], pagination: {} };
        }
        // Получаем свой username из профиля
        const profile = await this.client.users.getMyProfile();
        if (!profile || !profile.username) {
            console.error('Ошибка: не удалось получить свой username');
            return { posts: [], pagination: {} };
        }
        return await this.getPosts(profile.username, limit, sort, cursor);
    }
    
    /**
     * Получает последний пост пользователя (удобный метод)
     * 
     * @param {string} username - Имя пользователя
     * @returns {Promise<Object|null>} Последний пост или null
     */
    async getUserLatestPost(username) {
        const result = await this.getPosts(username, 1, 'new');
        if (result && result.posts && result.posts.length > 0) {
            return result.posts[0];
        }
        return null;
    }
    
    /**
     * Получает количество лайков поста (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<number>} Количество лайков
     */
    async getPostLikesCount(postId) {
        const post = await this.getPost(postId);
        return post ? (post.likesCount || 0) : 0;
    }
    
    /**
     * Получает количество просмотров поста (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<number>} Количество просмотров
     */
    async getPostViewsCount(postId) {
        const post = await this.getPost(postId);
        return post ? (post.viewsCount || 0) : 0;
    }
    
    /**
     * Получает количество комментариев поста (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<number>} Количество комментариев
     */
    async getPostCommentsCount(postId) {
        const post = await this.getPost(postId);
        return post ? (post.commentsCount || 0) : 0;
    }
    
    /**
     * Получает статистику поста (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<Object|null>} { likes: number, views: number, comments: number, reposts: number } или null
     */
    async getPostStats(postId) {
        const post = await this.getPost(postId);
        if (!post) return null;
        return {
            likes: post.likesCount || 0,
            views: post.viewsCount || 0,
            comments: post.commentsCount || 0,
            reposts: post.repostsCount || 0
        };
    }
}
