/**
 * Менеджер для работы с поиском
 */
export class SearchManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
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
        try {
            const searchUrl = `${this.client.baseUrl}/api/search/`;
            const params = {
                q: query,
                userLimit: userLimit,
                hashtagLimit: hashtagLimit,
            };

            const response = await this.axios.get(searchUrl, { params });

            if (response.status === 200) {
                const data = response.data;
                
                // Структура ответа: { data: { users: [], hashtags: [] } }
                if (data.data) {
                    return {
                        users: data.data.users || [],
                        hashtags: data.data.hashtags || []
                    };
                }
                
                // Fallback
                if (data.users || data.hashtags) {
                    return {
                        users: data.users || [],
                        hashtags: data.hashtags || []
                    };
                }
                
                return { users: [], hashtags: [] };
            } else {
                console.error(`Ошибка поиска: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при поиске:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Ищет пользователей (GET /api/users/search?q=..., требует авторизации).
     *
     * @param {string} query - Поисковый запрос
     * @param {number} limit - Максимальное количество пользователей (по умолчанию 20)
     * @returns {Promise<Array|null>} Массив пользователей или null при ошибке
     */
    async searchUsers(query, limit = 20) {
        const result = await this.client.users.searchUsers(query, limit);
        return result ? result.users : null;
    }

    /**
     * Ищет хэштеги (GET /api/hashtags?q=...).
     *
     * @param {string} query - Поисковый запрос
     * @param {number} limit - Максимальное количество хэштегов (по умолчанию 20)
     * @returns {Promise<Array|null>} Массив хэштегов или null при ошибке
     */
    async searchHashtags(query, limit = 20) {
        const result = await this.client.hashtags.search(query, limit);
        return result ? result.hashtags : null;
    }
}
