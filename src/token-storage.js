/**
 * Утилита для сохранения токена в .env файл
 */
import fs from 'fs';
import path from 'path';

/**
 * Обновляет ITD_ACCESS_TOKEN в .env файле
 *
 * @param {string} newToken - Новый access token
 * @param {string} [envPath] - Путь к .env (по умолчанию process.cwd() + '/.env')
 * @returns {Promise<boolean>} True если успешно
 */
export async function saveAccessToken(newToken, envPath = null) {
    try {
        const targetPath = envPath ?? path.join(process.cwd(), '.env');

        let content;
        if (!fs.existsSync(targetPath)) {
            content = '# ITD SDK - создано автоматически\nITD_BASE_URL=https://xn--d1ah4a.com\n';
        } else {
            content = fs.readFileSync(targetPath, 'utf8');
        }
        
        // Ищем строку с ITD_ACCESS_TOKEN
        const tokenRegex = /^ITD_ACCESS_TOKEN=.*$/m;
        
        if (tokenRegex.test(content)) {
            // Заменяем существующий токен
            content = content.replace(tokenRegex, `ITD_ACCESS_TOKEN=${newToken}`);
        } else {
            // Добавляем новую строку, если токена нет
            content += `\nITD_ACCESS_TOKEN=${newToken}\n`;
        }
        
        fs.writeFileSync(targetPath, content, 'utf8');
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
 * @param {string} [cookiesPath] - Путь к .cookies (по умолчанию process.cwd() + '/.cookies')
 * @returns {Promise<boolean>} True если успешно
 */
export async function saveCookieHeader(newCookieHeader, cookiesPath = null) {
    try {
        const targetPath = cookiesPath ?? path.join(process.cwd(), '.cookies');

        // Просто записываем cookies в файл (одна строка)
        fs.writeFileSync(targetPath, newCookieHeader, 'utf8');
        console.log('✅ Cookies сохранены в .cookies');
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения cookies в .cookies:', error.message);
        return false;
    }
}
