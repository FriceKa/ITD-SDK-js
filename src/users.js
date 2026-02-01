/**
 * Модуль для работы с пользователями
 */
export class UsersManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Обновляет профиль текущего пользователя.
     * PUT /api/users/me → { id, username, displayName, bio, updatedAt }
     *
     * @param {string|null} bio - Новое описание профиля (опционально)
     * @param {string|null} displayName - Новое отображаемое имя (опционально)
     * @param {string|null} username - Новый username (опционально)
     * @param {string|null} bannerId - ID загруженного баннера (опционально)
     * @returns {Promise<Object|null>} Обновленные данные профиля или null при ошибке
     */
    async updateProfile(bio = null, displayName = null, username = null, bannerId = null) {
        if (!await this.client.requireAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }

        try {
            const updateUrl = `${this.client.baseUrl}/api/users/me`;
            const updateData = {};
            if (bio != null) updateData.bio = bio;
            if (displayName != null) updateData.displayName = displayName;
            if (username != null) updateData.username = username;
            if (bannerId != null) updateData.bannerId = bannerId;
            if (Object.keys(updateData).length === 0) {
                return await this.getMyProfile();
            }

            const response = await this.axios.put(updateUrl, updateData);

            if (response.status === 200) {
                return response.data?.data ?? response.data;
            } else {
                console.error(`Ошибка обновления профиля: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Исключение при обновлении профиля:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Получает данные текущего пользователя
     * 
     * @returns {Promise<Object|null>} Данные профиля или null при ошибке
     */
    async getMyProfile() {
        if (!await this.client.requireAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }

        try {
            const profileUrl = `${this.client.baseUrl}/api/users/me`;
            const response = await this.axios.get(profileUrl);

            if (response.status === 200) {
                return response.data;
            } else {
                console.error(`Ошибка получения профиля: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Исключение при получении профиля:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Получает настройки приватности текущего пользователя.
     * GET /api/users/me/privacy → { isPrivate, wallClosed }
     *
     * @returns {Promise<Object|null>} { isPrivate, wallClosed } или null при ошибке
     */
    async getPrivacy() {
        if (!await this.client.requireAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        try {
            const url = `${this.client.baseUrl}/api/users/me/privacy`;
            const response = await this.axios.get(url);
            if (response.status === 200) {
                return response.data?.data ?? response.data;
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения приватности:', error.message);
            return null;
        }
    }

    /**
     * Обновляет настройки приватности.
     * PUT /api/users/me/privacy → { isPrivate, wallClosed }
     *
     * @param {Object} options - { isPrivate?: boolean, wallClosed?: boolean }
     * @returns {Promise<Object|null>} { isPrivate, wallClosed } или null при ошибке
     */
    async updatePrivacy(options = {}) {
        if (!await this.client.requireAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        try {
            const url = `${this.client.baseUrl}/api/users/me/privacy`;
            const payload = {};
            if (options.isPrivate != null) payload.isPrivate = options.isPrivate;
            if (options.wallClosed != null) payload.wallClosed = options.wallClosed;
            if (Object.keys(payload).length === 0) return await this.getPrivacy();

            const response = await this.axios.put(url, payload);
            if (response.status === 200) {
                return response.data?.data ?? response.data;
            }
            return null;
        } catch (error) {
            console.error('Ошибка обновления приватности:', error.message);
            return null;
        }
    }

    /**
     * Получает профиль пользователя по username
     * 
     * @param {string} username - Имя пользователя
     * @returns {Promise<Object|null>} Данные профиля или null при ошибке
     * 
     * Примечание: Авторизация не требуется для просмотра публичных профилей
     */
    async getUserProfile(username) {
        try {
            const profileUrl = `${this.client.baseUrl}/api/users/${username}`;
            const response = await this.axios.get(profileUrl);

            if (response.status === 200) {
                // Структура может быть { data: {...} } или просто {...}
                return response.data.data || response.data;
            } else {
                console.error(`Ошибка получения профиля пользователя: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Исключение при получении профиля пользователя:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Подписывается на пользователя
     * 
     * @param {string} username - Имя пользователя
     * @returns {Promise<Object|null>} { following: true, followersCount: number } или null при ошибке
     */
    async followUser(username) {
        if (!await this.client.requireAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }

        try {
            const followUrl = `${this.client.baseUrl}/api/users/${username}/follow`;
            const response = await this.axios.post(followUrl);

            if (response.status === 200 || response.status === 201) {
                return response.data; // { following: true, followersCount: number }
            } else {
                console.error(`Ошибка подписки: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Исключение при подписке:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Отписывается от пользователя
     * 
     * @param {string} username - Имя пользователя
     * @returns {Promise<Object|null>} { following: false, followersCount: number } или null при ошибке
     */
    async unfollowUser(username) {
        if (!await this.client.requireAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }

        try {
            const unfollowUrl = `${this.client.baseUrl}/api/users/${username}/follow`;
            const response = await this.axios.delete(unfollowUrl);

            if (response.status === 200 || response.status === 204) {
                return response.data || { following: false, followersCount: 0 };
            } else {
                console.error(`Ошибка отписки: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Исключение при отписке:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Получает список подписчиков пользователя
     * 
     * @param {string} username - Имя пользователя
     * @param {number} page - Номер страницы (начиная с 1)
     * @param {number} limit - Количество на странице
     * @returns {Promise<Object|null>} { users: [], pagination: {} } или null при ошибке
     * 
     * Примечание: Авторизация не требуется для просмотра подписчиков
     */
    async getFollowers(username, page = 1, limit = 30) {
        try {
            const followersUrl = `${this.client.baseUrl}/api/users/${username}/followers`;
            const params = { page, limit };
            const response = await this.axios.get(followersUrl, { params });

            if (response.status === 200) {
                const data = response.data;
                // Структура: { data: { users: [...], pagination: {...} } }
                if (data.data && data.data.users) {
                    return {
                        users: data.data.users,
                        pagination: data.data.pagination || {}
                    };
                } else if (data.users) {
                    return {
                        users: data.users,
                        pagination: data.pagination || {}
                    };
                }
                return { users: [], pagination: {} };
            } else {
                console.error(`Ошибка получения подписчиков: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при получении подписчиков:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Получает список подписок пользователя
     * 
     * @param {string} username - Имя пользователя
     * @param {number} page - Номер страницы (начиная с 1)
     * @param {number} limit - Количество на странице
     * @returns {Promise<Object|null>} { users: [], pagination: {} } или null при ошибке
     * 
     * Примечание: Авторизация не требуется для просмотра подписок
     */
    async getFollowing(username, page = 1, limit = 30) {
        try {
            const followingUrl = `${this.client.baseUrl}/api/users/${username}/following`;
            const params = { page, limit };
            const response = await this.axios.get(followingUrl, { params });

            if (response.status === 200) {
                const data = response.data;
                // Структура: { data: { users: [...], pagination: {...} } }
                if (data.data && data.data.users) {
                    return {
                        users: data.data.users,
                        pagination: data.data.pagination || {}
                    };
                } else if (data.users) {
                    return {
                        users: data.users,
                        pagination: data.pagination || {}
                    };
                }
                return { users: [], pagination: {} };
            } else {
                console.error(`Ошибка получения подписок: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при получении подписок:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Получает клан пользователя (эмодзи из avatar)
     * 
     * @param {string} username - Имя пользователя
     * @returns {Promise<string|null>} Эмодзи клана или null при ошибке
     */
    async getUserClan(username) {
        const profile = await this.getUserProfile(username);
        if (!profile) {
            return null;
        }
        // Клан - это эмодзи в поле avatar
        return profile.avatar || null;
    }

    /**
     * Получает топ кланов по количеству участников.
     * Возвращает массив (Array), не объект с полем clans.
     *
     * @returns {Promise<Array|null>} Массив кланов [{ avatar, memberCount }, ...] или null при ошибке
     */
    async getTopClans() {
        try {
            const topClansUrl = `${this.client.baseUrl}/api/users/stats/top-clans`;
            const response = await this.axios.get(topClansUrl);

            if (response.status === 200) {
                const data = response.data?.data ?? response.data;
                return data?.clans || [];
            } else {
                console.error(`Ошибка получения топ кланов: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при получении топ кланов:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Получает рекомендации кого подписаться
     * 
     * @returns {Promise<Array|null>} Массив пользователей или null при ошибке
     */
    async getWhoToFollow() {
        if (!await this.client.requireAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }

        try {
            const suggestionsUrl = `${this.client.baseUrl}/api/users/suggestions/who-to-follow`;
            const response = await this.axios.get(suggestionsUrl);

            if (response.status === 200) {
                const data = response.data;
                // Структура: { users: [...] }
                return data.users || [];
            } else {
                console.error(`Ошибка получения рекомендаций: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при получении рекомендаций:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }
    
    // ========== USER-FRIENDLY МЕТОДЫ ==========
    
    // getMyProfile() уже реализован выше (строка 60) - это удобный метод по умолчанию
    
    /**
     * Проверяет, подписан ли текущий пользователь на указанного (удобный метод)
     * 
     * @param {string} username - Имя пользователя для проверки
     * @returns {Promise<boolean>} True если подписан, false если нет или ошибка
     */
    async isFollowing(username) {
        if (!await this.client.requireAuth()) {
            return false;
        }
        const profile = await this.getUserProfile(username);
        return profile ? (profile.isFollowing === true) : false;
    }
    
    /**
     * Получает количество своих подписчиков (удобный метод)
     * 
     * @returns {Promise<number>} Количество подписчиков
     */
    async getMyFollowersCount() {
        const profile = await this.getMyProfile();
        return profile ? (profile.followersCount || 0) : 0;
    }
    
    /**
     * Получает количество своих подписок (удобный метод)
     * 
     * @returns {Promise<number>} Количество подписок
     */
    async getMyFollowingCount() {
        const profile = await this.getMyProfile();
        return profile ? (profile.followingCount || 0) : 0;
    }
    
    /**
     * Получает свой клан (эмодзи аватара) (удобный метод)
     * 
     * @returns {Promise<string|null>} Эмодзи клана или null
     */
    async getMyClan() {
        const profile = await this.getMyProfile();
        return profile ? (profile.avatar || null) : null;
    }
}
