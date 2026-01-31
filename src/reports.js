/**
 * Менеджер для работы с репортами (жалобами)
 */
export class ReportsManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Отправляет репорт на пост, комментарий или пользователя.
     * POST /api/reports → { data: { id, createdAt } }
     *
     * @param {string} targetType - Тип цели: "post", "comment", "user"
     * @param {string} targetId - ID цели (поста, комментария или пользователя)
     * @param {string} reason - Причина: "spam", "violence", "hate", "adult", "fraud", "other"
     * @param {string} description - Описание проблемы (опционально)
     * @returns {Promise<Object|null>} { id, createdAt } или null при ошибке
     */
    async report(targetType, targetId, reason = 'other', description = '') {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт для отправки репорта');
            return null;
        }

        try {
            const reportUrl = `${this.client.baseUrl}/api/reports`;
            const payload = {
                targetType: targetType,
                targetId: targetId,
                reason: reason,
            };

            if (description) {
                payload.description = description;
            }

            const response = await this.axios.post(reportUrl, payload);

            if (response.status === 200 || response.status === 201) {
                // Структура ответа: { data: { id, createdAt } }
                if (response.data && response.data.data) {
                    return response.data.data;
                }
                return response.data || { success: true };
            } else {
                console.error(`Ошибка отправки репорта: ${response.status}`);
                if (response.data) {
                    console.error('Response data:', response.data);
                }
                return null;
            }
        } catch (error) {
            console.error('Исключение при отправке репорта:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Отправляет репорт на пост
     *
     * @param {string} postId - ID поста
     * @param {string} reason - Причина: "spam", "violence", "hate", "adult", "fraud", "other" (по умолчанию "other")
     * @param {string} description - Описание проблемы
     * @returns {Promise<Object|null>} { id, createdAt } или null при ошибке
     */
    async reportPost(postId, reason = 'other', description = '') {
        return await this.report('post', postId, reason, description);
    }

    /**
     * Отправляет репорт на комментарий
     * 
     * @param {string} commentId - ID комментария
     * @param {string} reason - Причина: "spam", "violence", "hate", "adult", "fraud", "other"
     * @param {string} description - Описание проблемы
     * @returns {Promise<Object|null>} { id, createdAt } или null при ошибке
     */
    async reportComment(commentId, reason = 'other', description = '') {
        return await this.report('comment', commentId, reason, description);
    }

    /**
     * Отправляет репорт на пользователя
     * 
     * @param {string} userId - ID пользователя
     * @param {string} reason - Причина: "spam", "violence", "hate", "adult", "fraud", "other"
     * @param {string} description - Описание проблемы
     * @returns {Promise<Object|null>} { id, createdAt } или null при ошибке
     */
    async reportUser(userId, reason = 'other', description = '') {
        return await this.report('user', userId, reason, description);
    }
}
