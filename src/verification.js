/**
 * Модуль верификации аккаунта
 */
export class VerificationManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Получает статус верификации. GET /api/verification/status
     *
     * @returns {Promise<Object|null>} Статус верификации или null
     */
    async getStatus() {
        if (!await this.client.auth.checkAuth()) return null;
        try {
            const url = `${this.client.baseUrl}/api/verification/status`;
            const response = await this.axios.get(url);
            if (response.status === 200) {
                return response.data?.data ?? response.data;
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения статуса верификации:', error.message);
            return null;
        }
    }

    /**
     * Подаёт заявку на верификацию. POST /api/verification/submit
     *
     * @param {string} videoUrl - URL загруженного видео (из uploadFile)
     * @returns {Promise<Object|null>} { success, request: { id, status, ... } } или null
     */
    async submit(videoUrl) {
        if (!await this.client.auth.checkAuth()) return null;
        try {
            const url = `${this.client.baseUrl}/api/verification/submit`;
            const response = await this.axios.post(url, { videoUrl });
            if (response.status === 200 || response.status === 201) {
                return response.data?.data ?? response.data;
            }
            return null;
        } catch (error) {
            console.error('Ошибка подачи заявки на верификацию:', error.message);
            return null;
        }
    }
}
