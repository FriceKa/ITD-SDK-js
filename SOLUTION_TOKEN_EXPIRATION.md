# Как правильно обновлять `accessToken` в ITD SDK (через `.cookies`)

Этот файл — подробный “человеческий” гайд, чтобы **в другом проекте** всё стабильно работало (бот/шедулер/cron), даже если `accessToken` истекает между запросами.

## Коротко: что у нас есть

- **accessToken (JWT)** — живёт недолго (условно ~15 минут). Его нужно подставлять в `Authorization: Bearer ...`.
- **refresh_token (cookie)** — живёт дольше и позволяет получить новый `accessToken` через `POST /api/v1/auth/refresh`.
- **SDK** умеет автоматически обновлять `accessToken` на `401`, **но только если** в cookie-jar есть `refresh_token` (обычно берётся из файла `.cookies`).

Если `.cookies` нет или в нём нет `refresh_token`, то после истечения JWT вы получите `401` и ошибку типа `REFRESH_TOKEN_MISSING`.

## 1) Как правильно собрать `.cookies` (самое важное)

### Где взять cookie

1. Открой `итд.com` в браузере и **выйди/зайди заново**, чтобы обновились cookies.
2. Открой DevTools → **Network**.
3. Открой любой запрос к домену `xn--d1ah4a.com` (например `GET /api/users/me` или `GET /api/profile`).
4. В **Request Headers** скопируй **поле `Cookie` целиком** (оно длинное).

### Как должен выглядеть файл

В корне проекта (рядом с `.env`) создай файл **`.cookies`** и вставь туда **одной строкой** ровно то, что было в заголовке `Cookie`.

Пример (условный):

```text
refresh_token=eyJhbGci...; is_auth=1; __ddg1_=...; __ddg2_=...
```

### Что обязательно должно быть

- Внутри должен встречаться **`refresh_token=`**.
- Если его нет — refresh не будет работать, и это не “баг SDK”, это просто **нечем** рефрешить.

## 2) Как проверить, что SDK реально видит refresh token

В SDK есть метод:

```javascript
if (client.hasRefreshToken()) {
  console.log('✅ refresh_token есть, можно авто-рефрешить');
} else {
  console.log('❌ refresh_token нет — обнови .cookies');
}
```

Если тут `false`, то:
- либо `.cookies` отсутствует/пустой,
- либо в `.cookies` нет `refresh_token`,
- либо SDK ищет файл не там (по умолчанию корень = `process.cwd()`; при запуске из другой директории или при необходимости задайте `projectRoot` или `cookiesPath` в конструкторе `new ITDClient({ projectRoot: '...' })`).

## 3) Что происходит в SDK при истечении токена

Механика такая:

1. Ты делаешь запрос (например `createPost`)
2. Сервер отвечает **401**
3. Интерцептор axios в SDK ловит 401 и вызывает `POST /api/v1/auth/refresh`
4. Если refresh успешен — SDK:
   - ставит новый `accessToken` в память
   - сохраняет новый токен в `.env` (если настроено)
   - повторяет исходный запрос
5. Если refresh неуспешен (например `REFRESH_TOKEN_MISSING`) — SDK не может продолжить и запрос падает

## 4) Правильный паттерн для бота/шедулера (рекомендуется)

Если у тебя между постами/тасками могут быть большие паузы (10–15+ минут), **вызови проверку перед каждым “важным” действием**:

```javascript
await client.validateAndRefreshToken();
const post = await client.createPost('...', './image.png');
```

`validateAndRefreshToken()` делает “лёгкую” проверку токена и, если нужно, пытается обновить.

### Почему это лучше, чем “создавать новый client каждый раз”

- Новый `ITDClient()` **не магически обновляет токен** — он просто заново читает `.cookies` и `.env`.
- Если `.cookies` корректный — можно и так, и так. Но правильнее держать один клиент и делать `validateAndRefreshToken()` перед задачей.

## 5) Что делать, если `.cookies` есть, но refresh всё равно не работает

Самые частые причины:

- **cookie протух/отозван** (refresh_token истёк или сервер его инвалидировал)
- ты **скопировал Cookie из запроса, где его нет** (например, из статики/картинок иногда другой набор)
- ты **скопировал не Request Headers**, а Response headers
- файл `.cookies` содержит переносы строк / лишние кавычки / обрезан

Решение почти всегда одно: **обнови `.cookies` заново** по шагам из раздела 1.

## 6) Что SDK НЕ может сделать

- **Нельзя** обновить `accessToken`, если **нет `refresh_token`** (это не “обход”, это базовая логика auth).
- `checkAuth()` не валидирует токен по сети — он только проверяет, что токен “вообще задан”.
  Для реальной проверки/рефреша используй `validateAndRefreshToken()`.

## 7) Минимальный пример для твоего проекта (OracleBot)

```javascript
import { ITDClient } from 'itd-sdk-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new ITDClient();
// Токен подхватывается из .env автоматически

if (!client.hasRefreshToken()) {
  throw new Error('Нет refresh_token. Обнови .cookies из браузера.');
}

export async function safeCreatePost(text, imagePath) {
  const ok = await client.validateAndRefreshToken();
  if (!ok) throw new Error('Токен истёк и не обновился (проверь .cookies)');
  return await client.createPost(text, imagePath);
}
```

## 8) Где посмотреть рабочий пример в репозитории SDK

- `examples/token-validation.js` — пример логики “много запросов подряд”.

## Последнее замечание

Если ты запускаешь бот как сервис (pm2/systemd/docker), `.cookies` должен находиться **в рабочей директории процесса**, где запускается Node, либо ты должен запускать процесс из корня проекта SDK/бота, где лежит `.cookies`.
