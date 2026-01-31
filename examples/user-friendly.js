/**
 * ✨ Пример 2: Удобные методы (User-Friendly)
 * 
 * Демонстрирует преимущества удобных методов SDK.
 * Показывает, как просто работать с данными без сложных запросов.
 */

import { ITDClient } from 'itd-sdk-js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('✨ === Удобные методы SDK ===\n');

    const client = new ITDClient();

    try {
        // Пример 1: Проверка подписки - одна строка вместо сложного запроса
        console.log('1️⃣  Проверка подписки:');
        const username = 'BobrishYa';
        const isFollowing = await client.isFollowing(username);
        console.log(`   Подписан на ${username}: ${isFollowing ? '✅ Да' : '❌ Нет'}`);
        console.log();

        // Пример 2: Получение статистики поста - просто и понятно
        console.log('2️⃣  Статистика поста:');
        const postId = '936bd898-f1f4-4fcd-a498-f3a7ee8e67bb'; // Замените на реальный ID
        const stats = await client.getPostStats(postId);
        if (stats) {
            console.log(`   Лайков: ${stats.likes}`);
            console.log(`   Просмотров: ${stats.views}`);
            console.log(`   Комментариев: ${stats.comments}`);
            console.log(`   Репостов: ${stats.reposts}`);
        } else {
            console.log('   Пост не найден');
        }
        console.log();

        // Пример 3: Проверка уведомлений - удобно и быстро
        console.log('3️⃣  Проверка уведомлений:');
        const hasUnread = await client.hasUnreadNotifications();
        if (hasUnread) {
            const unread = await client.getUnreadNotifications(5);
            console.log(`   Непрочитанных: ${unread.notifications.length}`);
            unread.notifications.forEach((notif, i) => {
                console.log(`   ${i + 1}. ${notif.type} - ${notif.read ? '✅' : '🔔'}`);
            });
        } else {
            console.log('   Нет непрочитанных уведомлений');
        }
        console.log();

        // Пример 4: Получение клана пользователя - просто
        console.log('4️⃣  Клан пользователя:');
        const myClan = await client.getMyClan();
        const userClan = await client.getUserClan(username);
        console.log(`   Мой клан: ${myClan}`);
        console.log(`   Клан ${username}: ${userClan}`);
        console.log();

        // Пример 5: Получение последнего поста - удобно
        console.log('5️⃣  Последний пост пользователя:');
        const latestPost = await client.getUserLatestPost(username);
        if (latestPost) {
            console.log(`   Последний пост: ${latestPost.content?.substring(0, 60)}...`);
            console.log(`   Лайков: ${latestPost.likesCount}, Просмотров: ${latestPost.viewsCount}`);
        } else {
            console.log('   Постов не найдено');
        }

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

main();
