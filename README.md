# ITD-SDK-js

Неофициальная библиотека на Node.js для работы с API сайта [итд.com](http://итд.com). Упрощает написание ботов и скриптов: берет на себя авторизацию, поддержку сессий и предоставляет готовые методы для основных действий.

## Главное

- **Автоматический Refresh Token**: вам не нужно вручную обновлять `accessToken` в коде. SDK сам подхватит новый, если старый протух, используя данные из `.cookies`.
- **34 готовых метода**: от получения статистики постов до проверки подписок и работы с кланами.
- **Минимум зависимостей**: работает на `axios` и `dotenv`.

## Установка

Bash

```
npm install

```

## Настройка

1. Создайте `.env` на основе `.env.example`.
2. Вставьте свой `ITD_ACCESS_TOKEN` (его можно вытащить из Network в DevTools).
3. Для работы авто-обновления сессии создайте файл `.cookies` и вставьте туда строку `Cookie` из любого запроса к сайту в браузере.

Подробный гайд по настройке лежит в [API_REFERENCE.md](API_REFERENCE.md).

## Примеры

### Базовые запросы

JavaScript

```
import { ITDClient } from './src/client.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new ITDClient();
client.setAccessToken(process.env.ITD_ACCESS_TOKEN);
client.auth.isAuthenticated = true;

// Получаем профиль и тренды
const myProfile = await client.getMyProfile();
const trending = await client.getTrendingPosts(10);

console.log(`Авторизован как: ${myProfile.username}`);

```

### Статистика и уведомления

JavaScript

```
// Простая проверка непрочитанных
if (await client.hasUnreadNotifications()) {
    const list = await client.getUnreadNotifications(5);
    console.log(list.notifications);
}

// Статистика конкретного поста
const stats = await client.getPostStats('uuid-поста');
console.log(`${stats.likes} лайков, ${stats.views} просмотров`);

```

## Что умеет SDK

Весь список методов разбит по категориям в документации:

- **Посты**: тренды, поиск, создание, удаление, статистика.
- **Пользователи**: профили, счетчики подписок, клановые эмодзи.
- **Комментарии**: получение топов, ответы, проверка наличия.
- **Уведомления**: фильтрация только непрочитанных, отметка о прочтении.

Полное описание каждого метода — в **[API_REFERENCE.md](API_REFERENCE.md)**.

## Важно

Это неофициальный проект. Если разработчики сайта изменят структуру API или введут новую защиту, методы могут временно перестать работать. Используйте аккуратно и не спамьте запросами.

---

**Документация:** [API_REFERENCE.md](API_REFERENCE.md) | **Примеры кода:** [examples/README.md](examples/README.md)