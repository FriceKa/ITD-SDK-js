# API Reference — итд.com (Node.js SDK)

Техническое руководство по методам и настройке библиотеки для работы с API сайта `итд.com`.

## Подтверждённые эндпоинты

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/users/{username}` | Профиль → `{ id, username, displayName, avatar, banner, bio, verified, pinnedPostId, wallClosed, followersCount, followingCount, postsCount, isFollowing, isFollowedBy, createdAt }` |
| GET | `/api/users/{username}/followers?page=1&limit=30` | Подписчики → `{ data: { users: [], pagination: { page, limit, total, hasMore } } }` |
| GET | `/api/users/{username}/following?page=1&limit=30` | Подписки → `{ data: { users: [], pagination } }` |
| GET | `/api/posts/user/{username}?limit=20&sort=new` | Посты пользователя → `{ data: { posts: [], pagination: { limit, nextCursor, hasMore } } }` |
| GET | `/api/posts/user/{username}/liked?limit=20` | Лайкнутые посты → `{ data: { posts: [], pagination } }` |
| GET | `/api/hashtags/{name}/posts?limit=20` | Посты по хэштегу → `{ data: { hashtag: {}, posts: [], pagination } }` |
| GET | `/api/hashtags/trending?limit=10` | Трендовые хэштеги → `{ data: { hashtags: [{ id, name, postsCount }] } }` |
| GET | `/api/users/suggestions/who-to-follow` | Рекомендации → `{ users: [] }` |
| GET | `/api/users/stats/top-clans` | Топ кланов → `{ clans: [{ avatar, memberCount }] }` |
| POST | `/api/posts` | Создать пост. `{ content, wallRecipientId?, attachmentIds? }` → `{ id, content, author, ... }` |
| PUT | `/api/posts/{id}` | Редактировать пост. `{ content }` → `{ id, content, updatedAt }` |
| DELETE | `/api/posts/{id}` | Удалить пост (пустой ответ) |
| POST | `/api/posts/{id}/restore` | Восстановить пост (пустой ответ) |
| POST | `/api/posts/{id}/repost` | Репост. `{ content? }` (комментарий опционально). **attachmentIds игнорируется** — вложения в репост не поддерживаются. |
| POST | `/api/posts/{id}/like` | Лайк → `{ liked: true, likesCount }` |
| DELETE | `/api/posts/{id}/like` | Снять лайк → `{ liked: false, likesCount }` |
| POST | `/api/posts/{id}/pin` | Закрепить пост → `{ success: true, pinnedPostId }` |
| DELETE | `/api/posts/{id}/pin` | Открепить пост → `{ success: true, pinnedPostId: null }` |
| POST | `/api/posts/{id}/view` | Отметить пост как просмотренный |
| GET | `/api/posts/user/{username}/wall` | Посты на стене пользователя → `{ data: { posts: [], pagination } }` |
| POST | `/api/comments/{id}/restore` | Восстановить удалённый комментарий |
| POST | `/api/v1/auth/change-password` | Смена пароля. `{ oldPassword, newPassword }`. Требует cookies. |
| GET | `/api/files/{id}` | Информация о файле |
| DELETE | `/api/files/{id}` | Удалить файл |
| GET | `/api/verification/status` | Статус верификации |
| POST | `/api/verification/submit` | Подать заявку на верификацию. `{ videoUrl }` |
| GET | `/api/platform/status` | Статус платформы |
| POST | `/api/files/upload` | Загрузка файла (изображения, audio/ogg). → 201, `{ id, url, filename, mimeType, size }` |
| PUT | `/api/users/me` | Обновить профиль (bio, displayName, username, bannerId) |
| POST | `/api/reports` | Рекорт. `{ targetType, targetId, reason, description? }` → `{ data: { id, createdAt } }`. reason: `spam`, `violence`, `hate`, `adult`, `fraud`, `other` |
| GET | `/api/notifications/?offset=0&limit=20` | Список уведомлений → `{ notifications: [], hasMore }` |
| POST | `/api/notifications/read-batch` | Отметить несколько прочитанными → `{ success: true, count }` |
| POST | `/api/notifications/read-all` | Отметить все прочитанными → `{ success: true }` |
| GET | `/api/users/me/privacy` | Настройки приватности → `{ isPrivate, wallClosed }` |
| PUT | `/api/users/me/privacy` | Обновить приватность |
| POST | `/api/v1/auth/refresh` | Обновить токен → `{ accessToken }` |
| POST | `/api/v1/auth/logout` | Выход → 204 |
| GET | `/api/posts/{id}` | Один пост |
| GET | `/api/posts/{postId}/comments?limit&sort` | Комментарии к посту → `{ data: { comments: [], total, hasMore, nextCursor } }`. sort: `newest`, `oldest`, `popular` |
| POST | `/api/posts/{postId}/comments` | Добавить комментарий. `{ content?, attachmentIds? }` — голосовые: content пустой, attachmentIds с id из uploadFile (audio/ogg) |
| POST | `/api/comments/{id}/replies` | Ответ на комментарий. `{ content, replyToUserId }` |
| GET | `/api/comments/{id}/replies?page&limit&sort` | Ответы на комментарий (пагинация по page) |
| POST | `/api/reports` | targetType: `post`, `comment`, `user`. 400 при повторном репорте: «Вы уже отправляли жалобу» |
| DELETE | `/api/comments/{id}` | Удалить комментарий (пустой ответ). На своей стене можно удалять любые. |
| POST/DELETE | `/api/comments/{id}/like` | Лайк/снять лайк на комментарий или реплай → `{ liked, likesCount }` |
| POST | `/api/users/{username}/follow` | Подписаться → `{ following: true, followersCount }` |
| DELETE | `/api/users/{username}/follow` | Отписаться → `{ following: false, followersCount }` |

### Эндпоинты без подтверждения

| Метод | Эндпоинт | Используется в |
|-------|----------|----------------|
| GET | `/api/posts?tab=popular` / `tab=following` | `getFeedPopular`, `getFeedFollowing` — в веб-интерфейсе нет переключения |
| POST | `/api/notifications/{id}/read` | `markNotificationAsRead` |
| GET | `/api/notifications/count` | `getNotificationCount`, `hasUnreadNotifications` |
| GET | `/api/search/?q=&userLimit=&hashtagLimit=` | `search`, `searchUsers`, `searchHashtags` |

Если какой‑то метод возвращает ошибку — проверь эндпоинт в DevTools.

## Структура SDK

| Файл | Назначение |
|------|------------|
| `client.js` | Главный клиент: создание axios, загрузка cookies, хранение токена, менеджеры, хелперы `get/post/put/patch/delete` |
| `auth.js` | Авторизация: refresh, logout, checkAuth, ensureAuthenticated, validateAndRefreshToken |
| `token-storage.js` | Сохранение токена в .env и cookies в .cookies (используется auth при refresh) |
| `posts.js` | Посты: createPost, getPosts, editPost, deletePost и др. |
| `comments.js` | Комментарии: addComment, replyToComment, getComments, likeComment и др. |
| `users.js` | Пользователи: getMyProfile, getUserProfile, followUser, getTopClans и др. |
| `notifications.js` | Уведомления |
| `hashtags.js` | Хэштеги |
| `files.js` | Загрузка, получение, удаление файлов |
| `verification.js` | Верификация: getStatus, submit |
| `search.js` | Поиск |
| `reports.js` | Жалобы |

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

**Простой вариант:**

```javascript
import { ITDClient } from 'itd-sdk-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new ITDClient();
// Токен подхватывается из .env автоматически
```

**Только .cookies (без ITD_ACCESS_TOKEN в .env):**

```javascript
const client = new ITDClient();
await client.ensureAuthenticated(); // получит токен через refresh из .cookies
```

**С опциями (projectRoot / envPath / cookiesPath):**

Если скрипт запускается из подпапки или нужны явные пути:

```javascript
const client = new ITDClient({
    baseUrl: 'https://xn--d1ah4a.com',
    userAgent: '...',
    projectRoot: process.cwd(),
    requestTimeout: 60000,
    uploadTimeout: 120000,
    accessToken: '...',                       // опционально; по умолчанию из .env ITD_ACCESS_TOKEN
});
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

- `getFeedPopular(limit, cursor)` — лента популярных постов. ⚠️ GET `/api/posts?tab=popular` **не подтверждён** (в веб-интерфейсе нет переключения). Тула для теста: `tools/test-feed-tabs.js`.
- `getFeedFollowing(limit, cursor)` — лента подписок. ⚠️ GET `/api/posts?tab=following` **не подтверждён**. Требует авторизацию.
- `getPostsList(username?, limit?)` — упрощенный метод, возвращает только массив постов (без pagination).
- `editPost(postId, newContent)` — редактирование текста. PUT `/api/posts/{id}`. `{ content }` → `{ id, content, updatedAt }`.
- `viewPost(postId)` — отметить пост как просмотренный. POST `/api/posts/{id}/view`.
- `getWallByUser(username, limit, cursor)` — посты на стене пользователя. GET `/api/posts/user/{username}/wall`.
- `deletePost(postId)` — удаление поста. DELETE `/api/posts/{id}`. Возвращает `boolean`.
- `restorePost(postId)` — восстановление удалённого поста. POST `/api/posts/{id}/restore`.
- `getLikedPosts(username, limit, cursor)` — лайкнутые посты пользователя. GET `/api/posts/user/{username}/liked` → `{ posts: [], pagination }`.
- `pinPost(postId)` — закрепить пост. POST `/api/posts/{id}/pin` → `{ success: true, pinnedPostId }`.
- `unpinPost(postId)` — открепить пост. DELETE `/api/posts/{id}/pin` → `{ success: true, pinnedPostId: null }`.
- `repost(postId, comment?)` — репост. POST `/api/posts/{id}/repost`. `{ content? }` (комментарий опционально). **attachmentIds не поддерживается** — API игнорирует вложения при репосте.
- `likePost(postId)` **/** `unlikePost(postId)` — управление лайками. Возвращают `{ liked: boolean, likesCount: number }`.

---

## Методы API: Комментарии

### getComments(postId, limit, sort)

Получает дерево комментариев к посту. GET `/api/posts/{postId}/comments?limit&sort`.

- **Параметры**: `postId`, `limit` (по умолчанию 20, в запросе ограничивается 1–100), `sort` — в SDK можно передавать `"popular"`, `"new"`, `"old"`; в API уходит `popular`, `newest`, `oldest` соответственно.
- **Ответ API:** `{ data: { comments: [], total, hasMore, nextCursor } }`. Комментарии могут содержать вложенные `replies`, у ответов — поле `replyTo`.
- **Отдельный эндпоинт для ответов:** GET `/api/comments/{id}/replies?page=1&limit=50&sort=oldest` — пагинация по `page`, не по cursor. В SDK нет отдельного метода `getReplies`; ответы приходят внутри `getComments`.

### addComment(postId, text, replyToCommentId?, attachmentIds?)

Добавляет новый комментарий. POST `/api/posts/{postId}/comments`. Payload: `{ content?, attachmentIds? }`.

- **Текст**: `content` — текст комментария.
- **Голосовое**: `content` пустой, `attachmentIds: [uploadedId]` — id из `uploadFile` (audio/ogg). Вложения в ответе имеют `type: "audio"`, `duration`, `mimeType: "audio/ogg"`.

### addVoiceComment(postId, audioPath, replyToCommentId?)

Добавляет голосовое сообщение. Загружает audio/ogg через `uploadFile` и создаёт комментарий с `attachmentIds`. Удобный метод поверх `addComment(postId, '', replyToCommentId, [uploadedId])`.

### replyToComment(commentId, content, replyToUserId)

Ответ на комментарий через отдельный эндпоинт **POST** `/api/comments/:commentId/replies`.

- **Параметры**:
  - `commentId` — ID комментария, на который отвечаем.
  - `content` — текст ответа.
  - `replyToUserId` — ID пользователя-автора комментария (обязательно для API).
- **Возвращает:** объект созданного комментария-ответа или `null` при ошибке.

Пример: `client.replyToComment('80a775df-811a-4b60-b2fd-24651c1e546e', 'кака', '220e565c-45b9-4634-bdba-a6ebe6e8c5d1')`.

### Управление комментариями

- `likeComment(commentId)` **/** `unlikeComment(commentId)` — лайки на комментарии/реплаи. POST/DELETE `/api/comments/{id}/like` → `{ liked, likesCount }`.
- `deleteComment(commentId)` — удаление комментария. DELETE `/api/comments/{id}` (пустой ответ). На своей стене можно удалять любые комментарии.
- `restoreComment(commentId)` — восстановление удалённого комментария. POST `/api/comments/{id}/restore`.

---

## Методы API: Профили и подписки

- `getMyProfile()` — данные текущего аккаунта (требует auth).
- `getUserProfile(username)` — публичный профиль любого пользователя.
- `updateProfile(bio?, displayName?, username?, bannerId?)` — обновление профиля. PUT `/api/users/me`. Поддерживает `bannerId` (ID из `uploadFile`).
- `getPrivacy()` — настройки приватности. GET `/api/users/me/privacy` → `{ isPrivate, wallClosed }`.
- `updatePrivacy({ isPrivate?, wallClosed? })` — обновление приватности. PUT `/api/users/me/privacy`.
- `getFollowers(username, page, limit)` — список подписчиков.
- `getFollowing(username, page, limit)` — список подписок.
- `followUser(username)` **/** `unfollowUser(username)` — подписка/отписка. POST/DELETE `/api/users/{username}/follow` → `{ following, followersCount }`.
- `getUserClan(username)` — получение эмодзи-аватара пользователя.

## Методы API: Управление токенами

- `hasRefreshToken()` — проверяет наличие refresh_token в cookies. Возвращает `boolean`.
- `ensureAuthenticated()` — если нет accessToken, но есть refresh_token — вызывает refresh и получает токен. Возвращает `Promise<boolean>`. Для сценария «только .cookies»: `await client.ensureAuthenticated()` перед первым запросом.
- `validateAndRefreshToken()` — проверяет валидность токена и обновляет его при необходимости. Возвращает `Promise<boolean>`.
- `refreshAccessToken()` — принудительно обновляет токен через refresh endpoint. Возвращает `Promise<string|null>`.

**Кастомные запросы:** `client.get(path)`, `client.post(path, data)`, `client.put(path, data)`, `client.patch(path, data)`, `client.delete(path)` — для произвольных эндпоинтов (baseURL уже подставлен).

- `changePassword(oldPassword, newPassword)` — смена пароля. POST `/api/v1/auth/change-password`. Требует cookies (refresh_token).
- `getVerificationStatus()` — статус верификации. GET `/api/verification/status`.
- `submitVerification(videoUrl)` — подать заявку на верификацию. POST `/api/verification/submit`. videoUrl — URL из `uploadFile`.
- `getPlatformStatus()` — статус платформы. GET `/api/platform/status`.
- `getFile(fileId)` — информация о файле. GET `/api/files/{id}`.
- `deleteFile(fileId)` — удалить файл. DELETE `/api/files/{id}`.

**Рекомендация:** При множественных запросах с интервалами (более 10-15 минут) вызывайте `validateAndRefreshToken()` перед каждым запросом.

---

## Методы API: Уведомления и поиск

### getNotifications(limit, offset, type?)

Список уведомлений. GET `/api/notifications/?offset=0&limit=20` → `{ notifications: [], hasMore }`.

- **Параметры**: `limit` (по умолчанию 20), `offset` (смещение для пагинации), `type` (фильтр на клиенте).

### Прочие методы уведомлений

- `getNotificationsByType(type, limit, offset)` — уведомления конкретного типа. Возвращает `{ notifications: [], hasMore }`.
- `markNotificationAsRead(notificationId)` — пометка одного прочитанным. ⚠️ Эндпоинт POST `/api/notifications/{id}/read` **не подтверждён**.
- `markNotificationsAsReadBatch(ids)` — пометка нескольких. POST `/api/notifications/read-batch` → `{ success: true, count }`.
- `markAllNotificationsAsRead()` — пометка всех. POST `/api/notifications/read-all` → `{ success: true }`.
- `getNotificationCount()` — счетчик непрочитанных. ⚠️ Эндпоинт GET `/api/notifications/count` **не подтверждён**. Альтернатива: `hasUnread` можно вычислить по `getNotifications()` (поле `read` у каждого).

### Поиск и рекомендации

- `search(query, userLimit?, hashtagLimit?)` — универсальный поиск. ⚠️ Эндпоинт GET `/api/search/?q=&userLimit=&hashtagLimit=` **не подтверждён**. Возвращает `{ users: [], hashtags: [] }`.
- `searchUsers(query, limit?)` — поиск только пользователей.
- `searchHashtags(query, limit?)` — поиск только хэштегов.
- `getTopClans()` — рейтинг кланов по количеству участников. **Возвращает массив** `Array<{ avatar, memberCount }>` или **`null`** при ошибке (не объект с полем `clans`).
- `getWhoToFollow()` — рекомендованные пользователи.
- `getTrendingHashtags(limit)` — список популярных тегов.
- `getPostsByHashtag(tagName, limit, cursor)` — поиск постов по тегу. Возвращает `{ posts: [], hashtag: {}, pagination: {} }`.

### Файлы и репорты

- `uploadFile(filePath)` — загрузка файла через `/api/files/upload`. Возвращает `{ id, url, filename, mimeType, size }` или **`null`** при ошибке. Таймаут — `uploadTimeout` (по умолчанию 120 с). Используется автоматически при создании поста с изображением.
- `getFile(fileId)` — информация о файле. GET `/api/files/{id}`.
- `deleteFile(fileId)` — удалить файл. DELETE `/api/files/{id}`.
- `report(targetType, targetId, reason?, description?)` — отправка репорта. `targetType`: `"post"`, `"comment"`, `"user"`. `reason`: `"spam"`, `"violence"`, `"hate"`, `"adult"`, `"fraud"`, `"other"`. Возвращает `{ id, createdAt }`. При повторном репорте того же контента API возвращает 400: «Вы уже отправляли жалобу на этот контент».
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
- `getUnreadNotifications(limit, offset)` — только непрочитанные. Возвращает `{ notifications: [], hasMore }`.

---

## Структура данных

### Пагинация

Разные методы используют разную пагинацию:

| Метод | Тип | Параметр | Пример ответа |
|-------|-----|----------|---------------|
| `getPosts`, `getComments`, `getPostsByHashtag`, `getLikedPosts` | cursor | `nextCursor` | `{ limit, nextCursor, hasMore }` |
| `getNotifications`, `getUnreadNotifications` | offset | `offset` | `{ notifications, hasMore }` |
| `getFollowers`, `getFollowing` | page | `page` | `{ page, limit, total, hasMore }` |

```javascript
// Посты — cursor
const result = await client.getPosts('username', 20, 'new');
if (result.pagination.hasMore) {
    const nextPage = await client.getPosts('username', 20, 'new', result.pagination.nextCursor);
}

// Уведомления — offset
const notif = await client.getNotifications(20, 0);
const next = await client.getNotifications(20, 20);

// Подписчики — page
const fol = await client.getFollowers('username', 1, 30);
const nextPage = await client.getFollowers('username', 2, 30);
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

**Последнее обновление документации**: 2026-01-31.

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
