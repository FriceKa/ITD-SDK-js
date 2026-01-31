/**
 * Модуль для работы с уведомлениями
 */
export class NotificationsManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Получает список уведомлений.
     * GET /api/notifications/?offset=0&limit=20 → { notifications: [], hasMore }
     *
     * @param {number} limit - Количество уведомлений
     * @param {number} offset - Смещение для пагинации
     * @param {string|null} type - Фильтр по типу: 'reply', 'like', 'wall_post', 'follow', 'comment' (на клиенте)
     * @returns {Promise<Object|null>} { notifications: [], hasMore } или null при ошибке
     */
    async getNotifications(limit = 20, offset = 0, type = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }

        try {
            const notificationsUrl = `${this.client.baseUrl}/api/notifications`;
            const params = { limit, offset };

            const response = await this.axios.get(notificationsUrl, { params });

            if (response.status === 200) {
                const data = response.data;
                let notifications = Array.isArray(data?.notifications) ? data.notifications : [];
                const hasMore = Boolean(data?.hasMore);

                if (type && notifications.length > 0) {
                    notifications = notifications.filter(notif => notif.type === type);
                }

                return { notifications, hasMore };
            } else {
                console.error(`Ошибка получения уведомлений: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при получении уведомлений:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Отмечает несколько уведомлений как прочитанные.
     * POST /api/notifications/read-batch → { success: true, count: number }
     *
     * @param {string[]} ids - Массив ID уведомлений
     * @returns {Promise<Object|null>} { success: true, count } или null при ошибке
     */
    async markAsReadBatch(ids) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }
        if (!Array.isArray(ids) || ids.length === 0) {
            return { success: true, count: 0 };
        }
        try {
            const url = `${this.client.baseUrl}/api/notifications/read-batch`;
            const response = await this.axios.post(url, { ids });
            if (response.status === 200) {
                return response.data;
            }
            return null;
        } catch (error) {
            console.error('Исключение при отметке уведомлений:', error.message);
            return null;
        }
    }

    /**
     * Отмечает уведомление как прочитанное
     * 
     * @param {string} notificationId - ID уведомления
     * @returns {Promise<Object|null>} { success: true } или null при ошибке
     */
    async markAsRead(notificationId) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }

        try {
            const readUrl = `${this.client.baseUrl}/api/notifications/${notificationId}/read`;
            const response = await this.axios.post(readUrl);

            if (response.status === 200 || response.status === 204) {
                // Структура ответа: { success: true }
                return response.data || { success: true };
            } else {
                console.error(`Ошибка отметки уведомления: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Исключение при отметке уведомления:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Получает количество непрочитанных уведомлений
     * 
     * @returns {Promise<number|null>} Количество уведомлений или null при ошибке
     */
    async getUnreadCount() {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }

        try {
            const countUrl = `${this.client.baseUrl}/api/notifications/count`;
            const response = await this.axios.get(countUrl);

            if (response.status === 200) {
                const data = response.data;
                // Структура: { count: number }
                return data.count || 0;
            } else {
                console.error(`Ошибка получения количества уведомлений: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при получении количества уведомлений:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Отмечает все уведомления как прочитанные.
     * POST /api/notifications/read-all → { success: true }
     *
     * @returns {Promise<boolean>} True если успешно
     */
    async markAllAsRead() {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return false;
        }

        try {
            const readAllUrl = `${this.client.baseUrl}/api/notifications/read-all`;
            const response = await this.axios.post(readAllUrl);

            if (response.status === 200 || response.status === 204) {
                return response.data?.success !== false;
            } else {
                console.error(`Ошибка отметки всех уведомлений: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return false;
            }
        } catch (error) {
            console.error('Исключение при отметке всех уведомлений:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return false;
        }
    }
    
    // ========== USER-FRIENDLY МЕТОДЫ ==========
    
    /**
     * Проверяет, есть ли непрочитанные уведомления (удобный метод)
     * 
     * @returns {Promise<boolean>} True если есть непрочитанные
     */
    async hasUnreadNotifications() {
        const count = await this.getUnreadCount();
        return (count || 0) > 0;
    }
    
    /**
     * Получает только непрочитанные уведомления (удобный метод)
     *
     * @param {number} limit - Количество уведомлений
     * @param {number} offset - Смещение для пагинации
     * @returns {Promise<Object|null>} { notifications: [], hasMore } или null
     */
    async getUnreadNotifications(limit = 20, offset = 0) {
        const all = await this.getNotifications(limit, offset);
        if (!all) return null;
        const unread = all.notifications.filter(n => !n.read);
        return { notifications: unread, hasMore: all.hasMore };
    }

}
