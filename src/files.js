/**
 * Модуль для работы с файлами
 */
import fs from 'fs';
import FormData from 'form-data';

export class FilesManager {
    constructor(client) {
        this.client = client;
        this.axios = client.axios;
    }

    /**
     * Загружает файл на сервер. POST /api/files/upload.
     * Поддерживает изображения и аудио (audio/ogg для голосовых в комментариях).
     * Таймаут — client.uploadTimeout (по умолчанию 120 с). При ошибке возвращает null.
     *
     * @param {string} filePath - Путь к файлу
     * @returns {Promise<Object|null>} { id, url, filename, mimeType, size } или null при ошибке
     */
    async uploadFile(filePath) {
        if (!await this.client.auth.checkAuth()) {
            console.error('Ошибка: необходимо войти в аккаунт');
            return null;
        }

        try {
            // Проверка существования файла
            if (!fs.existsSync(filePath)) {
                console.error(`Ошибка: файл ${filePath} не найден`);
                return null;
            }

            const uploadUrl = `${this.client.baseUrl}/api/files/upload`;
            
            // Создаем FormData для multipart/form-data
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));

            const response = await this.axios.post(uploadUrl, formData, {
                timeout: this.client.uploadTimeout ?? 120000,
                headers: {
                    ...formData.getHeaders(),
                }
            });

            if (response.status === 200 || response.status === 201) {
                return response.data; // { id, url, filename, mimeType, size }
            } else {
                console.error(`Ошибка загрузки файла: ${response.status} - ${JSON.stringify(response.data)}`);
                return null;
            }
        } catch (error) {
            console.error('Исключение при загрузке файла:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Получает информацию о файле. GET /api/files/{id}
     *
     * @param {string} fileId - ID файла
     * @returns {Promise<Object|null>} { id, url, filename, mimeType, size, ... } или null
     */
    async getFile(fileId) {
        if (!await this.client.auth.checkAuth()) return null;
        try {
            const url = `${this.client.baseUrl}/api/files/${fileId}`;
            const response = await this.axios.get(url);
            if (response.status === 200) {
                return response.data?.data ?? response.data;
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения файла:', error.message);
            return null;
        }
    }

    /**
     * Удаляет файл. DELETE /api/files/{id}
     *
     * @param {string} fileId - ID файла
     * @returns {Promise<boolean>} True если успешно
     */
    async deleteFile(fileId) {
        if (!await this.client.auth.checkAuth()) return false;
        try {
            const url = `${this.client.baseUrl}/api/files/${fileId}`;
            const response = await this.axios.delete(url);
            return response.status === 200 || response.status === 204;
        } catch (error) {
            console.error('Ошибка удаления файла:', error.message);
            return false;
        }
    }
}
