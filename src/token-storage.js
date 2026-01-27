/**
 * Утилита для сохранения токена в .env файл
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Обновляет ITD_ACCESS_TOKEN в .env файле
 * 
 * @param {string} newToken - Новый access token
 * @returns {Promise<boolean>} True если успешно
 */
export async function saveAccessToken(newToken) {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        
        if (!fs.existsSync(envPath)) {
            console.warn('⚠️  Файл .env не найден, токен не сохранен');
            return false;
        }
        
        let content = fs.readFileSync(envPath, 'utf8');
        
        // Ищем строку с ITD_ACCESS_TOKEN
        const tokenRegex = /^ITD_ACCESS_TOKEN=.*$/m;
        
        if (tokenRegex.test(content)) {
            // Заменяем существующий токен
            content = content.replace(tokenRegex, `ITD_ACCESS_TOKEN=${newToken}`);
        } else {
            // Добавляем новую строку, если токена нет
            content += `\nITD_ACCESS_TOKEN=${newToken}\n`;
        }
        
        fs.writeFileSync(envPath, content, 'utf8');
        console.log('✅ Токен сохранен в .env');
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения токена в .env:', error.message);
        return false;
    }
}

/**
 * Сохраняет cookies в файл .cookies
 * 
 * @param {string} newCookieHeader - Новый cookie header
 * @returns {Promise<boolean>} True если успешно
 */
export async function saveCookieHeader(newCookieHeader) {
    try {
        const cookiesPath = path.join(__dirname, '..', '.cookies');
        
        // Просто записываем cookies в файл (одна строка)
        fs.writeFileSync(cookiesPath, newCookieHeader, 'utf8');
        console.log('✅ Cookies сохранены в .cookies');
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения cookies в .cookies:', error.message);
        return false;
    }
}
