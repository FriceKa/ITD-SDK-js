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
     * Загружает файл (изображение) на сервер
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
}
