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
        if (!await this.client.requireAuth()) {
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
        if (!await this.client.requireAuth()) {
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
        if (!await this.client.requireAuth()) {
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
        if (!await this.client.requireAuth()) {
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
        if (!await this.client.requireAuth()) {
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

    /**
     * Открывает SSE-стрим уведомлений (GET /api/notifications/stream).
     * Требует авторизации. В Node.js используется fetch + потоковая разборка SSE.
     *
     * @param {Object} options
     * @param {function(Object): void} [options.onEvent] - Вызывается при каждом событии (data — распарсенный JSON или строка)
     * @param {function(Error): void} [options.onError] - Вызывается при ошибке чтения/сети
     * @returns {Promise<{ close: function() }|null>} Объект с методом close() для остановки стрима, или null если не авторизован/ошибка старта
     */
    async getNotificationStream(options = {}) {
        if (!await this.client.requireAuth()) {
            console.error('Ошибка: для стрима уведомлений необходима авторизация');
            return null;
        }

        const { onEvent = () => {}, onError = (err) => console.error('Notification stream error:', err.message) } = options;
        const url = `${this.client.baseUrl}/api/notifications/stream`;
        const controller = new AbortController();
        const token = this.client.accessToken;

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Authorization': token ? `Bearer ${token}` : '',
                    ...(this.client.userAgent && { 'User-Agent': this.client.userAgent }),
                },
            });

            if (!response.ok || !response.body) {
                onError(new Error(`Stream failed: ${response.status}`));
                return null;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            (async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() ?? '';
                        let currentData = null;
                        for (const line of lines) {
                            if (line.startsWith('data:')) {
                                currentData = line.slice(5).trim();
                            } else if (line === '' && currentData !== null) {
                                try {
                                    const parsed = currentData === '' ? null : JSON.parse(currentData);
                                    onEvent(parsed);
                                } catch {
                                    onEvent(currentData);
                                }
                                currentData = null;
                            }
                        }
                    }
                } catch (e) {
                    if (e.name !== 'AbortError') onError(e);
                }
            })();

            return {
                close() {
                    controller.abort();
                },
            };
        } catch (err) {
            onError(err);
            return null;
        }
    }

}
