/**
 * Модуль для работы с хэштегами
 */
export class HashtagsManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Получает трендовые хэштеги
     * 
     * @param {number} limit - Количество хэштегов (по умолчанию 10)
     * @returns {Promise<Object|null>} { hashtags: [] } или null при ошибке
     */
    async getTrending(limit = 10) {
        try {
            const trendingUrl = `${this.client.baseUrl}/api/hashtags/trending`;
            const params = { limit };
            const response = await this.axios.get(trendingUrl, { params });

            if (response.status === 200) {
                const data = response.data;
                // Структура: { data: { hashtags: [...] } }
                if (data.data && data.data.hashtags) {
                    return {
                        hashtags: data.data.hashtags
                    };
                } else if (data.hashtags) {
                    return {
                        hashtags: data.hashtags
                    };
                }
                return { hashtags: [] };
            } else {
                console.error(`Ошибка получения трендовых хэштегов: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при получении трендовых хэштегов:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
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
        try {
            // Убираем # если есть
            const cleanHashtag = hashtagName.replace(/^#/, '');
            const hashtagUrl = `${this.client.baseUrl}/api/hashtags/${encodeURIComponent(cleanHashtag)}/posts`;
            
            const params = { limit };
            if (cursor) {
                params.cursor = cursor;
            }

            const response = await this.axios.get(hashtagUrl, { params });

            if (response.status === 200) {
                const data = response.data;
                
                // Структура: { data: { hashtag: {...} или null, posts: [...], pagination: {...} } }
                if (data.data) {
                    return {
                        hashtag: data.data.hashtag || null,
                        posts: data.data.posts || [],
                        pagination: data.data.pagination || {}
                    };
                }
                
                // Fallback
                return {
                    hashtag: null,
                    posts: data.posts || [],
                    pagination: data.pagination || {}
                };
            } else {
                console.error(`Ошибка получения постов по хэштегу: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при получении постов по хэштегу:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
}
