/**
 * Модуль для работы с уведомлениями
 */
export class NotificationsManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Получает список уведомлений
     * 
     * @param {number} limit - Количество уведомлений
     * @param {string|null} cursor - Курсор для пагинации
     * @param {string|null} type - Фильтр по типу: 'reply', 'like', 'wall_post', 'follow', 'comment' (опционально)
     * @returns {Promise<Object|null>} { notifications: [], pagination: {} } или null при ошибке
     */
    async getNotifications(limit = 20, cursor = null, type = null) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }

        try {
            const notificationsUrl = `${this.client.baseUrl}/api/notifications`;
            const params = { limit };
            if (cursor) {
                params.cursor = cursor;
            }
            // Пробуем передать type в параметрах (если API поддерживает)
            if (type) {
                params.type = type;
            }

            const response = await this.axios.get(notificationsUrl, { params });

            if (response.status === 200) {
                const data = response.data;
                let notifications = [];
                let pagination = {};
                
                // Предполагаемая структура: { data: { notifications: [...], pagination: {...} } }
                if (data.data && data.data.notifications) {
                    notifications = data.data.notifications;
                    pagination = data.data.pagination || {};
                } else if (Array.isArray(data)) {
                    notifications = data;
                } else if (data.notifications) {
                    notifications = data.notifications;
                    pagination = data.pagination || {};
                }
                
                // Фильтруем по типу на клиенте (если API не поддерживает фильтрацию)
                if (type && notifications.length > 0) {
                    notifications = notifications.filter(notif => notif.type === type);
                }
                
                return {
                    notifications: notifications,
                    pagination: pagination
                };
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
     * Отмечает все уведомления как прочитанные
     * 
     * @returns {Promise<boolean>} True если успешно
     */
    async markAllAsRead() {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return false;
        }

        try {
            // Нужно найти реальный endpoint, пока используем предположительный
            const readAllUrl = `${this.client.baseUrl}/api/notifications/read-all`;
            const response = await this.axios.post(readAllUrl);

            if (response.status === 200 || response.status === 204) {
                return true;
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
                // Если 404 - значит endpoint неправильный, нужно найти реальный
                if (error.response.status === 404) {
                    console.error('💡 Endpoint не найден. Найди реальный URL в DevTools');
                }
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
     * @param {string|null} cursor - Курсор для пагинации
     * @returns {Promise<Object|null>} { notifications: [], pagination: {} } или null
     */
    async getUnreadNotifications(limit = 20, cursor = null) {
        const all = await this.getNotifications(limit, cursor);
        if (!all) return null;
        
        // Фильтруем только непрочитанные
        const unread = all.notifications.filter(n => !n.read);
        return {
            notifications: unread,
            pagination: all.pagination
        };
    }

}
