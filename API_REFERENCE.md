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

**Пути к .env и .cookies:** по умолчанию SDK ищет и сохраняет эти файлы в **корне проекта** (`process.cwd()`). При refresh токена обновлённые значения пишутся в ваш проект, а не в папку пакета. При необходимости можно задать свой корень или явные пути через опции конструктора (см. ниже).

---

## Авторизация и сессии

### Инициализация клиента

**Простой вариант (корень проекта = текущая рабочая директория):**

```javascript
import { ITDClient } from 'itd-sdk-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new ITDClient();
client.setAccessToken(process.env.ITD_ACCESS_TOKEN);
client.auth.isAuthenticated = true;
```

**С опциями (projectRoot / envPath / cookiesPath):**

Если скрипт запускается из подпапки или нужны явные пути:

```javascript
const client = new ITDClient({
    baseUrl: 'https://xn--d1ah4a.com',
    userAgent: '...',
    projectRoot: process.cwd(),              // корень проекта (по умолчанию process.cwd())
    // envPath: '/path/to/project/.env',
    // cookiesPath: '/path/to/project/.cookies',
    requestTimeout: 60000,                    // таймаут обычных запросов, мс (по умолчанию 60 с)
    uploadTimeout: 120000,                    // таймаут загрузки файлов и создания поста, мс (по умолчанию 120 с)
});
client.setAccessToken(process.env.ITD_ACCESS_TOKEN);
```

- `projectRoot` — директория, в которой ищутся `.env` и `.cookies` (по умолчанию `process.cwd()`).
- `envPath` / `cookiesPath` — при указании переопределяют пути, собранные из `projectRoot`.
- `requestTimeout` — таймаут обычных запросов в мс (по умолчанию 60000). Предотвращает бесконечное ожидание при «тяжёлой» сети.
- `uploadTimeout` — таймаут для загрузки файлов и создания поста в мс (по умолчанию 120000). Используется в `uploadFile`, `createPost`, `createWallPost`.

### Автоматическое обновление (Refresh Token)

При получении ошибки `401 Unauthorized` клиент автоматически обращается к эндпоинту `/api/v1/auth/refresh`, используя данные из `.cookies`. В случае успеха новый токен сохраняется в `.env`, обновляются куки, и исходный запрос повторяется.

**Важно:** Для автоматического обновления токена необходим `refresh_token` в файле `.cookies`. Если его нет, SDK не сможет обновить токен автоматически.

**Проверка наличия refresh_token:**
```javascript
if (client.hasRefreshToken()) {
    console.log('✅ Refresh token доступен, токен будет обновляться автоматически');
} else {
    console.log('⚠️  Refresh token не найден - обновите файл .cookies');
}
```

**Ручная проверка и обновление токена:**
```javascript
// Проверяет валидность токена и обновляет его при необходимости
const isValid = await client.validateAndRefreshToken();
if (isValid) {
    console.log('✅ Токен валиден или успешно обновлен');
} else {
    console.log('❌ Токен невалиден и не удалось обновить');
}
```

**Рекомендация для множественных запросов с интервалами:**
Если вы делаете запросы с большими интервалами (более 10-15 минут), рекомендуется проверять токен перед каждым запросом:
```javascript
// Перед публикацией поста
await client.validateAndRefreshToken();
const post = await client.createPost('Текст поста', 'image.jpg');
```

---

## Методы API: Посты

### createPost(text, imagePath?)

Создает новый пост. При указании `imagePath` файл предварительно загружается через `/api/files/upload`, после чего ID файла прикрепляется к посту через поле `attachmentIds`.

- **Возвращает:** объект поста при успехе; **`null`** при любой ошибке (сеть, 5xx, 429, не удалось загрузить файл, неверный ответ). Всегда проверяйте результат на `null`.
- **Таймаут:** для загрузки файла и создания поста используется `uploadTimeout` (по умолчанию 120 с), чтобы запрос не зависал при 504 или медленной сети.
- **Ретраи:** при 5xx/429 или «API вернул null» рекомендуется повторять запрос в приложении (например, до 3–8 попыток с экспоненциальной задержкой). Встроенных ретраев в SDK нет.

**Важно:** API использует поле `attachmentIds` (массив ID файлов), а не `attachments`. SDK автоматически использует правильное поле.

- **Параметры**: `text` (string), `imagePath` (string, опционально).

### createWallPost(username, text, imagePath?)

Создает пост **на стене другого пользователя** (wall post).

- **Возвращает:** объект поста при успехе; **`null`** при любой ошибке. Проверяйте результат на `null`; при 5xx/429 рекомендуется ретраи в приложении.
- **Таймаут:** используется `uploadTimeout` (по умолчанию 120 с).
- Делается через `POST /api/posts` с телом `{ content, wallRecipientId, attachmentIds? }`.
- `wallRecipientId` — это **ID пользователя-получателя**, поэтому метод сначала запрашивает профиль через `getUserProfile(username)` и берет `profile.id`.
- При указании `imagePath` файл загружается и прикрепляется через `attachmentIds`.

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

- **Параметры**: `postId`, `limit` (по умолчанию 20, в запросе ограничивается 1–100), `sort` — в SDK можно передавать `"popular"`, `"new"`, `"old"`; в API уходит `popular`, `newest`, `oldest` соответственно.
- **Ответ API:** `{ data: { comments: [], total, hasMore, nextCursor } }`. Комментарии могут содержать вложенные `replies`, у ответов — поле `replyTo`.

### addComment(postId, text, replyToCommentId?)

Добавляет новый комментарий или ответ на существующий (POST к посту: `/api/posts/:postId/comments`).

### replyToComment(commentId, content, replyToUserId)

Ответ на комментарий через отдельный эндпоинт **POST** `/api/comments/:commentId/replies`.

- **Параметры**:
  - `commentId` — ID комментария, на который отвечаем.
  - `content` — текст ответа.
  - `replyToUserId` — ID пользователя-автора комментария (обязательно для API).
- **Возвращает:** объект созданного комментария-ответа или `null` при ошибке.

Пример: `client.replyToComment('80a775df-811a-4b60-b2fd-24651c1e546e', 'кака', '220e565c-45b9-4634-bdba-a6ebe6e8c5d1')`.

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

## Методы API: Управление токенами

- `hasRefreshToken()` — проверяет наличие refresh_token в cookies. Возвращает `boolean`.
- `validateAndRefreshToken()` — проверяет валидность токена и обновляет его при необходимости. Возвращает `Promise<boolean>`.
- `refreshAccessToken()` — принудительно обновляет токен через refresh endpoint. Возвращает `Promise<string|null>`.

**Рекомендация:** При множественных запросах с интервалами (более 10-15 минут) вызывайте `validateAndRefreshToken()` перед каждым запросом.

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
- `getTopClans()` — рейтинг кланов по количеству участников. **Возвращает массив** `Array<{ avatar, memberCount }>` или **`null`** при ошибке (не объект с полем `clans`).
- `getWhoToFollow()` — рекомендованные пользователи.
- `getTrendingHashtags(limit)` — список популярных тегов.
- `getPostsByHashtag(tagName, limit, cursor)` — поиск постов по тегу. Возвращает `{ posts: [], hashtag: {}, pagination: {} }`.

### Файлы и репорты

- `uploadFile(filePath)` — загрузка файла через `/api/files/upload`. Возвращает `{ id, url, filename, mimeType, size }` или **`null`** при ошибке. Таймаут — `uploadTimeout` (по умолчанию 120 с). Используется автоматически при создании поста с изображением.
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

## Загрузка изображений

При создании поста с изображением SDK использует поле `attachmentIds` (массив ID файлов), а не `attachments`. Это правильное поле, которое требует API итд.com.

**Пример:**
```javascript
// Создание поста с изображением
await client.createPost('Текст поста', './image.jpg');
// SDK автоматически:
// 1. Загружает файл через /api/files/upload
// 2. Получает ID файла
// 3. Создает пост с attachmentIds: [fileId]
```

**Важно:** API возвращает attachments в ответе GET запроса, но для создания поста требуется использовать `attachmentIds` в payload.
