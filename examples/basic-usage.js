/**
 * 📝 Пример 1: Базовое использование SDK
 * 
 * Показывает простоту работы с API через удобные методы.
 */

import { ITDClient } from '../src/client.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('📝 === Базовое использование SDK ===\n');

    // Создаём клиент
    const client = new ITDClient();
    client.setAccessToken(process.env.ITD_ACCESS_TOKEN);
    client.auth.isAuthenticated = true;

    try {
        // Получаем свой профиль
        console.log('👤 Получаю свой профиль...');
        const profile = await client.getMyProfile();
        console.log(`   Имя: ${profile.displayName}`);
        console.log(`   Username: ${profile.username}`);
        console.log(`   Клан: ${profile.avatar}`);
        console.log(`   Подписчиков: ${profile.followersCount}`);
        console.log();

        // Получаем трендовые посты
        console.log('🔥 Получаю трендовые посты...');
        const trending = await client.getTrendingPosts(5);
        console.log(`   Найдено постов: ${trending.posts.length}`);
        if (trending.posts.length > 0) {
            const firstPost = trending.posts[0];
            console.log(`   Первый пост: ${firstPost.content?.substring(0, 50)}...`);
            console.log(`   Лайков: ${firstPost.likesCount}, Просмотров: ${firstPost.viewsCount}`);
        }
        console.log();

        // Получаем свои посты
        console.log('📄 Получаю свои посты...');
        const myPosts = await client.getMyPosts(3);
        console.log(`   Моих постов: ${myPosts.posts.length}`);
        myPosts.posts.forEach((post, i) => {
            console.log(`   ${i + 1}. ${post.content?.substring(0, 40)}... (${post.likesCount} лайков)`);
        });

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

main();
