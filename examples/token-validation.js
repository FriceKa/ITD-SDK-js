/**
 * Пример работы с токенами при множественных запросах
 * 
 * Демонстрирует правильную обработку истечения токена
 * при публикации нескольких постов с интервалами
 */

import { ITDClient } from '../src/client.js';
import dotenv from 'dotenv';

dotenv.config();

async function publishMultiplePosts() {
    const client = new ITDClient();
    
    console.log('📝 Публикация нескольких постов с проверкой токена\n');
    
    // Проверяем наличие refresh_token
    if (!client.hasRefreshToken()) {
        console.error('❌ ВНИМАНИЕ: refresh_token не найден в cookies!');
        console.error('💡 Решение:');
        console.error('   1. Откройте итд.com в браузере и войдите');
        console.error('   2. Откройте DevTools (F12) → Network');
        console.error('   3. Найдите любой запрос к итд.com');
        console.error('   4. Скопируйте значение заголовка Cookie');
        console.error('   5. Вставьте в файл .cookies в корне проекта');
        console.error('   6. Убедитесь, что в Cookie есть refresh_token\n');
        console.error('⚠️  Без refresh_token токен не будет обновляться автоматически!\n');
    } else {
        console.log('✅ Refresh token найден - токен будет обновляться автоматически\n');
    }
    
    const posts = [
        { text: 'Первый пост', image: 'image1.jpg' },
        { text: 'Второй пост', image: 'image2.jpg' },
        { text: 'Третий пост', image: 'image3.jpg' }
    ];
    
    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        console.log(`📝 Публикация поста ${i + 1}/${posts.length}...`);
        
        try {
            // ВАЖНО: Проверяем и обновляем токен перед каждым запросом
            // Это особенно важно при больших интервалах между запросами
            const tokenValid = await client.validateAndRefreshToken();
            
            if (!tokenValid) {
                console.error(`❌ Токен невалиден и не удалось обновить`);
                console.error(`   Пропускаю пост: ${post.text}`);
                continue;
            }
            
            // Публикуем пост
            const result = await client.createPost(post.text, post.image);
            
            if (result) {
                console.log(`✅ Пост ${i + 1} опубликован: ${result.id}\n`);
            } else {
                console.error(`❌ Не удалось опубликовать пост ${i + 1}\n`);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка при публикации поста ${i + 1}: ${error.message}\n`);
        }
        
        // Имитация интервала между постами
        if (i < posts.length - 1) {
            console.log('⏳ Ожидание перед следующим постом...\n');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    console.log('✅ Все посты обработаны');
}

async function main() {
    try {
        await publishMultiplePosts();
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
        process.exit(1);
    }
}

main();
