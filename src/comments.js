/**
 * Модуль работы с комментариями
 */
export class CommentsManager {
    /**
     * Управление комментариями
     * 
     * @param {ITDClient} client - Главный клиент
     */
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }
    
    /**
     * Добавляет комментарий к посту
     * 
     * @param {string} postId - ID поста
     * @param {string} text - Текст комментария
     * @param {string|null} replyToCommentId - ID комментария для ответа (опционально)
     * @returns {Promise<Object|null>} Данные созданного комментария или null
     */
    async addComment(postId, text, replyToCommentId = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        
        try {
            const commentUrl = `${this.client.baseUrl}/api/posts/${postId}/comments`;
            const commentData = {
                content: text,  // Реальное поле - content
            };
            
            // Если это ответ на комментарий
            if (replyToCommentId) {
                commentData.replyTo = replyToCommentId;
            }
            
            const response = await this.axios.post(commentUrl, commentData);
            
            if (response.status === 200 || response.status === 201) {
                return response.data;
            } else {
                console.error(`Ошибка добавления комментария: ${response.status} - ${JSON.stringify(response.data)}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при добавлении комментария:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Получает комментарии к посту
     * 
     * @param {string} postId - ID поста
     * @param {number} limit - Количество комментариев
     * @param {string} sort - Сортировка: "popular", "new", "old" (по умолчанию "popular")
     * @returns {Promise<Object>} { comments: [], total, hasMore, nextCursor } или { comments: [] } при ошибке
     * 
     * Примечание: Авторизация не требуется для просмотра комментариев
     */
    async getComments(postId, limit = 20, sort = 'popular') {
        try {
            const commentsUrl = `${this.client.baseUrl}/api/posts/${postId}/comments`;
            const params = {
                limit: limit,
                sort: sort,
            };
            
            const response = await this.axios.get(commentsUrl, { params });
            
            if (response.status === 200) {
                const data = response.data;
                // Структура: { data: { comments: [...], total, hasMore, nextCursor } }
                if (data.data && data.data.comments) {
                    return {
                        comments: data.data.comments,
                        total: data.data.total || 0,
                        hasMore: data.data.hasMore || false,
                        nextCursor: data.data.nextCursor || null
                    };
                } else if (data.comments) {
                    return {
                        comments: data.comments,
                        total: data.total || 0,
                        hasMore: data.hasMore || false,
                        nextCursor: data.nextCursor || null
                    };
                } else if (Array.isArray(data)) {
                    return {
                        comments: data,
                        total: data.length,
                        hasMore: false,
                        nextCursor: null
                    };
                }
                return { comments: [], total: 0, hasMore: false, nextCursor: null };
            } else {
                console.error(`Ошибка получения комментариев: ${response.status}`);
                return { comments: [], total: 0, hasMore: false, nextCursor: null };
            }
        } catch (error) {
            console.error('Исключение при получении комментариев:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return { comments: [], total: 0, hasMore: false, nextCursor: null };
        }
    }
    
    /**
     * Ставит лайк на комментарий
     * 
     * @param {string} commentId - ID комментария
     * @returns {Promise<Object|null>} { liked: true, likesCount: number } или null при ошибке
     */
    async likeComment(commentId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        
        try {
            const likeUrl = `${this.client.baseUrl}/api/comments/${commentId}/like`;
            const response = await this.axios.post(likeUrl);
            
            if (response.status === 200 || response.status === 201) {
                return response.data; // { liked: true, likesCount: number }
            } else {
                console.error(`Ошибка лайка комментария: ${response.status} - ${JSON.stringify(response.data)}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при лайке комментария:', error.message);
            if (error.response) {
                console.error('Response:', error.response.status, error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Убирает лайк с комментария
     * 
     * @param {string} commentId - ID комментария
     * @returns {Promise<Object|null>} { liked: false, likesCount: number } или null при ошибке
     */
    async unlikeComment(commentId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        
        try {
            const unlikeUrl = `${this.client.baseUrl}/api/comments/${commentId}/like`;
            const response = await this.axios.delete(unlikeUrl);
            
            if (response.status === 200 || response.status === 204) {
                return response.data || { liked: false, likesCount: 0 };
            } else {
                console.error(`Ошибка убирания лайка с комментария: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Исключение при убирании лайка с комментария:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Удаляет комментарий
     * 
     * @param {number} commentId - ID комментария
     * @returns {Promise<boolean>} True если успешно
     */
    async deleteComment(commentId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return false;
        }
        
        try {
            const deleteUrl = `${this.client.baseUrl}/api/comments/${commentId}`;
            const response = await this.axios.delete(deleteUrl);
            
            if (response.status === 200 || response.status === 204) {
                return true;
            } else {
                console.error(`Ошибка удаления комментария: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('Исключение при удалении комментария:', error.message);
            return false;
        }
    }
    
    // ========== USER-FRIENDLY МЕТОДЫ ==========
    
    /**
     * Получает количество комментариев поста (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<number>} Количество комментариев
     */
    async getPostCommentsCount(postId) {
        const result = await this.getComments(postId, 1);
        if (result && result.total !== undefined) {
            return result.total;
        }
        // Fallback: получаем через пост
        const post = await this.client.posts.getPost(postId);
        return post ? (post.commentsCount || 0) : 0;
    }
    
    /**
     * Получает топ-комментарий поста (с наибольшим количеством лайков) (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<Object|null>} Топ-комментарий или null
     */
    async getTopComment(postId) {
        const result = await this.getComments(postId, 20, 'popular');
        if (result && result.comments && result.comments.length > 0) {
            // Сортируем по лайкам и возвращаем первый
            const sorted = [...result.comments].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
            return sorted[0];
        }
        return null;
    }
    
    /**
     * Проверяет, есть ли комментарии у поста (удобный метод)
     * 
     * @param {string} postId - ID поста
     * @returns {Promise<boolean>} True если есть комментарии
     */
    async hasComments(postId) {
        const count = await this.getPostCommentsCount(postId);
        return count > 0;
    }
}
