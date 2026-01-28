# API Reference — итд.com (Node.js SDK)

Техническое руководство по методам и настройке библиотеки для работы с API сайта `итд.com`.

## Установка

### Через npm

```bash
npm install itd-sdk-js
```

### Использование

```javascript
import { ITDClient } from 'itd-sdk-js';
```

## Настройка проекта

### 1. Переменные окружения (.env)

Создайте файл `.env` в корне проекта и укажите следующие параметры:

- `ITD_ACCESS_TOKEN` — ваш JWT токен.
- `ITD_BASE_URL` — `https://xn--d1ah4a.com`.
- `ITD_USER_AGENT` — строка User-Agent из браузера.

### 2. Файл .cookies

Для работы автоматического обновления токена создайте файл `.cookies` в корне проекта. Скопируйте содержимое заголовка `Cookie` из любого сетевого запроса к сайту в браузере и вставьте в этот файл.

---

## Авторизация и сессии

### Инициализация клиента

JavaScript

```
import { ITDClient } from 'itd-sdk-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new ITDClient();
client.setAccessToken(process.env.ITD_ACCESS_TOKEN);
client.auth.isAuthenticated = true;
```

### Автоматическое обновление (Refresh Token)

При получении ошибки `401 Unauthorized` клиент автоматически обращается к эндпоинту `/api/v1/auth/refresh`, используя данные из `.cookies`. В случае успеха новый токен сохраняется в `.env`, обновляются куки, и исходный запрос повторяется.

---

## Методы API: Посты

### createPost(text, imagePath?)

Создает новый пост. При указании `imagePath` файл предварительно загружается через `/api/files/upload`, после чего ID файла прикрепляется к посту.

- **Параметры**: `text` (string), `imagePath` (string, опционально).

### createWallPost(username, text, imagePath?)

Создает пост **на стене другого пользователя** (wall post).

- Делается через `POST /api/posts` с телом `{ content, wallRecipientId }`.
- `wallRecipientId` — это **ID пользователя-получателя**, поэтому метод сначала запрашивает профиль через `getUserProfile(username)` и берет `profile.id`.

- **Параметры**:
  - `username` — username получателя (string)
  - `text` — текст поста (string)
  - `imagePath` — путь к изображению (string, опционально)

### getPost(postId)

Запрашивает данные конкретного поста.

- **Возвращает**: Объект с контентом, автором и вложенными комментариями.

### getPosts(username, limit, sort, cursor, tab, type, filter)

Универсальный метод получения списков постов.

- **Параметры**:
  - `username` — имя пользователя (null для общей ленты).
  - `limit` — количество записей (default: 20).
  - `sort` — `new`, `old`, `popular`, `trending`, `recent`.
  - `tab` — `popular`, `following` или null.
  - `cursor` — идентификатор для пагинации.

### Прочие методы постов

- `getFeedPopular(limit, cursor)` — лента популярных постов. Возвращает `{ posts: [], pagination: {} }`.
- `getFeedFollowing(limit, cursor)` — лента подписок. Требует авторизацию. Возвращает `{ posts: [], pagination: {} }`.
- `getPostsList(username?, limit?)` — упрощенный метод, возвращает только массив постов (без pagination).
- `editPost(postId, newContent)` — редактирование текста. Возвращает обновленный объект поста.
- `deletePost(postId)` — удаление поста. Возвращает `boolean`.
- `pinPost(postId)` — закрепление записи. Возвращает `boolean`.
- `repost(postId, comment?)` — репост (нельзя репостнуть себя). Возвращает объект репоста.
- `likePost(postId)` **/** `unlikePost(postId)` — управление лайками. Возвращают `{ liked: boolean, likesCount: number }`.

---

## Методы API: Комментарии

### getComments(postId, limit, sort)

Получает дерево комментариев к посту.

- **Параметры**: `postId`, `limit`, `sort` (`popular`, `new`, `old`).

### addComment(postId, text, replyToCommentId?)

Добавляет новый комментарий или ответ на существующий.

### Управление комментариями

- `likeComment(commentId)` **/** `unlikeComment(commentId)` — лайки на комментарии.
- `deleteComment(commentId)` — удаление комментария.

---

## Методы API: Профили и подписки

- `getMyProfile()` — данные текущего аккаунта (требует auth).
- `getUserProfile(username)` — публичный профиль любого пользователя.
- `updateProfile(bio, displayName?)` — изменение описания и имени.
- `getFollowers(username, page, limit)` — список подписчиков.
- `getFollowing(username, page, limit)` — список подписок.
- `followUser(username)` **/** `unfollowUser(username)` — подписка/отписка.
- `getUserClan(username)` — получение эмодзи-аватара пользователя.

---

## Методы API: Уведомления и поиск

### getNotifications(limit, cursor, type?)

Список уведомлений с фильтрацией по типу (`reply`, `like`, `wall_post`, `follow`, `comment`).

### Прочие методы уведомлений

- `getNotificationsByType(type, limit, cursor)` — получение уведомлений конкретного типа.
- `markNotificationAsRead(notificationId)` — пометка прочитанным. Возвращает `{ success: true }`.
- `markAllNotificationsAsRead()` — пометка всех уведомлений (экспериментально).
- `getNotificationCount()` — счетчик непрочитанных сообщений. Возвращает `number`.

### Поиск и рекомендации

- `search(query, userLimit?, hashtagLimit?)` — универсальный поиск пользователей и хэштегов. Возвращает `{ users: [], hashtags: [] }`.
- `searchUsers(query, limit?)` — поиск только пользователей.
- `searchHashtags(query, limit?)` — поиск только хэштегов.
- `getTopClans()` — рейтинг кланов по количеству участников. Возвращает `{ clans: [{ avatar, memberCount }] }`.
- `getWhoToFollow()` — рекомендованные пользователи.
- `getTrendingHashtags(limit)` — список популярных тегов.
- `getPostsByHashtag(tagName, limit, cursor)` — поиск постов по тегу. Возвращает `{ posts: [], hashtag: {}, pagination: {} }`.

### Файлы и репорты

- `uploadFile(filePath)` — загрузка файла через `/api/files/upload`. Возвращает `{ id, url, filename, mimeType, size }`. Используется автоматически при создании поста с изображением.
- `report(targetType, targetId, reason?, description?)` — отправка репорта. `targetType`: `"post"`, `"comment"`, `"user"`. Возвращает `{ id, createdAt }`.
- `reportPost(postId, reason?, description?)` — репорт поста.
- `reportComment(commentId, reason?, description?)` — репорт комментария.
- `reportUser(userId, reason?, description?)` — репорт пользователя.

---

## Вспомогательные методы (Helpers)

Методы для быстрого доступа к статистике без парсинга полных объектов:

### Посты

- `getTrendingPosts(limit, cursor)` — трендовые посты. Возвращает `{ posts: [], pagination: {} }`.
- `getRecentPosts(limit, cursor)` — недавние посты. Возвращает `{ posts: [], pagination: {} }`.
- `getMyPosts(limit, sort, cursor)` — свои посты. Требует авторизацию.
- `getUserLatestPost(username)` — последний пост пользователя. Возвращает объект поста или `null`.
- `getPostStats(postId)` — возвращает `{ likes: number, views: number, comments: number, reposts: number }` или `null`.
- `getPostLikesCount(postId)`, `getPostViewsCount(postId)`, `getPostCommentsCount(postId)` — получение отдельных счетчиков. Возвращают `number`.

### Пользователи

- `getMyClan()` — свой клан (эмодзи). Возвращает `string` или `null`.
- `getMyFollowersCount()`, `getMyFollowingCount()` — количество подписчиков/подписок. Возвращают `number`.
- `isFollowing(username)` — проверка наличия подписки на пользователя. Возвращает `boolean`.

### Комментарии

- `getTopComment(postId)` — получение самого популярного комментария поста. Возвращает объект комментария или `null`.
- `hasComments(postId)` — проверка наличия комментариев. Возвращает `boolean`.

### Уведомления

- `hasUnreadNotifications()` — проверка наличия непрочитанных уведомлений. Возвращает `boolean`.
- `getUnreadNotifications(limit, cursor)` — только непрочитанные уведомления. Возвращает `{ notifications: [], pagination: {} }`.

---

## Структура данных

### Пагинация

Методы, возвращающие списки, используют курсорную пагинацию:

```javascript
const result = await client.getPosts('username', 20, 'new');
// result = { posts: [...], pagination: { limit: 20, nextCursor: "...", hasMore: true } }

// Следующая страница
if (result.pagination.hasMore) {
    const nextPage = await client.getPosts('username', 20, 'new', result.pagination.nextCursor);
}
```

### Структура поста

```javascript
{
    id: string,
    content: string,
    author: { id, username, displayName, avatar, verified },
    attachments: [{ id, type, url, thumbnailUrl, width, height }],
    likesCount: number,
    commentsCount: number,
    repostsCount: number,
    viewsCount: number,
    isLiked: boolean,
    isReposted: boolean,
    isOwner: boolean,
    createdAt: string,
    updatedAt?: string
}
```

### Структура комментария

```javascript
{
    id: string,
    content: string,
    author: { id, username, displayName, avatar, verified },
    likesCount: number,
    repliesCount: number,
    isLiked: boolean,
    createdAt: string,
    replies: [...], // Вложенные ответы
    replyTo?: { id, username, displayName }
}
```

## Обработка ошибок

- **401 Unauthorized**: Ошибка авторизации. SDK инициирует автоматический рефреш токена через `/api/v1/auth/refresh`. Если рефреш не удался, проверьте `.cookies` файл.
- **429 Too Many Requests**: Превышен лимит запросов. Необходимо проверять заголовок `Retry-After` и делать паузу.
- **SESSION_REVOKED**: Сессия недействительна. Требуется ручное обновление `.cookies` из браузера.

---

**Последнее обновление документации**: 2026-01-28.
