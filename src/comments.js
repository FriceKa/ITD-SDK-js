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
     * Добавляет комментарий к посту.
     * POST /api/posts/{postId}/comments → { id, content, author, attachments, ... }
     * Поддерживает текст, голосовые (attachmentIds с audio/ogg) и ответы (replyTo).
     *
     * @param {string} postId - ID поста
     * @param {string} text - Текст комментария (пустая строка для голосового)
     * @param {string|null} replyToCommentId - ID комментария для ответа (опционально)
     * @param {string[]|null} attachmentIds - ID загруженных файлов (audio/ogg для голосовых)
     * @returns {Promise<Object|null>} Данные созданного комментария или null
     */
    async addComment(postId, text, replyToCommentId = null, attachmentIds = null) {
        if (!await this.client.requireAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        try {
            const commentUrl = `${this.client.baseUrl}/api/posts/${postId}/comments`;
            const commentData = { content: text ?? '' };
            if (replyToCommentId) commentData.replyTo = replyToCommentId;
            if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
                commentData.attachmentIds = attachmentIds;
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
     * Добавляет голосовое сообщение в комментарий.
     * Загружает audio/ogg через /api/files/upload и создаёт комментарий с attachmentIds.
     *
     * @param {string} postId - ID поста
     * @param {string} audioPath - Путь к аудиофайлу (audio/ogg)
     * @param {string|null} replyToCommentId - ID комментария для ответа (опционально)
     * @returns {Promise<Object|null>} Данные созданного комментария или null
     */
    async addVoiceComment(postId, audioPath, replyToCommentId = null) {
        if (!await this.client.requireAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        const uploaded = await this.client.files.uploadFile(audioPath);
        if (!uploaded) return null;
        return await this.addComment(postId, '', replyToCommentId, [uploaded.id]);
    }

    /**
     * Ответ на комментарий (отдельный эндпоинт /api/comments/:id/replies).
     *
     * @param {string} commentId - ID комментария, на который отвечаем
     * @param {string} content - Текст ответа
     * @param {string} replyToUserId - ID пользователя-автора комментария (обязательно для API)
     * @returns {Promise<Object|null>} Данные созданного комментария-ответа или null при ошибке
     */
    async replyToComment(commentId, content, replyToUserId) {
        if (!await this.client.requireAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        if (!replyToUserId) {
            console.error('Ошибка: replyToUserId обязателен для ответа на комментарий');
            return null;
        }
        try {
            const url = `${this.client.baseUrl}/api/comments/${commentId}/replies`;
            const response = await this.axios.post(url, {
                content,
                replyToUserId,
            });
            if (response.status === 200 || response.status === 201) {
                return response.data;
            }
            console.error(`Ошибка ответа на комментарий: ${response.status} - ${JSON.stringify(response.data)}`);
            return null;
        } catch (error) {
            console.error('Исключение при ответе на комментарий:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    /**
     * Получает комментарии к посту.
     * API ожидает sort: "newest" | "oldest" | "popular". SDK принимает "new"/"old"/"popular" и маппит в newest/oldest/popular.
     *
     * @param {string} postId - ID поста
     * @param {number} limit - Количество комментариев (по умолчанию 20)
     * @param {string} sort - Сортировка: "popular", "new", "old" (в API уходит как popular, newest, oldest)
     * @returns {Promise<Object>} { comments: [], total, hasMore, nextCursor } или { comments: [] } при ошибке
     */
    async getComments(postId, limit = 20, sort = 'popular') {
        const commentsUrl = `${this.client.baseUrl}/api/posts/${postId}/comments`;
        const reqLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
        const sortMap = { new: 'newest', old: 'oldest', popular: 'popular', newest: 'newest', oldest: 'oldest' };
        const reqSort = sortMap[sort] || 'popular';

        const parseResponse = (response) => {
            const data = response.data?.data ?? response.data;
            if (data?.comments) {
                return {
                    comments: data.comments,
                    total: data.total ?? data.comments.length,
                    hasMore: data.hasMore ?? false,
                    nextCursor: data.nextCursor ?? null
                };
            }
            if (Array.isArray(data)) {
                return {
                    comments: data,
                    total: data.length,
                    hasMore: false,
                    nextCursor: null
                };
            }
            return { comments: [], total: 0, hasMore: false, nextCursor: null };
        };

        try {
            const response = await this.axios.get(commentsUrl, {
                params: { limit: reqLimit, sort: reqSort },
            });

            if (response.status === 200) {
                return parseResponse(response);
            }
            if (response.status === 422) {
                const fallback = await this.axios.get(commentsUrl, { params: { limit: reqLimit, sort: 'popular' } });
                if (fallback.status === 200) {
                    return parseResponse(fallback);
                }
                console.warn('⚠️  GET /api/posts/:postId/comments: 422. API ожидает sort: newest | oldest | popular.');
            }
            console.error(`Ошибка получения комментариев: ${response.status}`);
            return { comments: [], total: 0, hasMore: false, nextCursor: null };
        } catch (error) {
            if (error.response?.status === 422) {
                try {
                    const retry = await this.axios.get(commentsUrl, { params: { limit: 20, sort: 'popular' } });
                    if (retry.status === 200) {
                        return parseResponse(retry);
                    }
                } catch (_) {}
            }
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
        if (!await this.client.requireAuth()) {
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
        if (!await this.client.requireAuth()) {
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
        if (!await this.client.requireAuth()) {
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

    /**
     * Восстанавливает удалённый комментарий. POST /api/comments/{id}/restore
     *
     * @param {string} commentId - ID комментария
     * @returns {Promise<boolean>} True если успешно
     */
    async restoreComment(commentId) {
        if (!await this.client.requireAuth()) return false;
        try {
            const url = `${this.client.baseUrl}/api/comments/${commentId}/restore`;
            const response = await this.axios.post(url);
            return response.status === 200 || response.status === 201 || response.status === 204;
        } catch (error) {
            console.error('Исключение при восстановлении комментария:', error.message);
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
