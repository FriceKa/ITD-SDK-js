/**
 * Пул зеркал — распределение запросов по нескольким аккаунтам (разгрузка рейтлимита).
 * Не меняет поведение обычного ITDClient: один аккаунт = как раньше.
 * Подключение опционально: import { createMirrorPool } from 'itd-sdk-js/mirrors'.
 *
 * Распределение: автоматическое — каждый вызов метода идёт с очередного аккаунта по кругу.
 * Ручной режим: pool.getClient() возвращает следующий клиент; несколько операций подряд делайте через него.
 */

import fs from 'fs';
import path from 'path';
import { ITDClient } from './client.js';

const MANAGER_KEYS = new Set([
    'auth', 'posts', 'comments', 'users', 'notifications', 'hashtags',
    'files', 'reports', 'searchManager', 'verification'
]);

/**
 * Преобразует значение из JSON-зеркала в строку cookies (name=value; name2=value2).
 * @param {string|Object} val — строка или объект { refresh_token: "...", ... }
 */
function toCookieString(val) {
    if (typeof val === 'string') return val.trim();
    if (val && typeof val === 'object') {
        return Object.entries(val)
            .map(([k, v]) => (v != null && v !== '' ? `${k}=${v}` : null))
            .filter(Boolean)
            .join('; ');
    }
    return '';
}

/**
 * Загружает конфиги зеркал из одного файла (JSON: несколько аккаунтов в одном месте).
 * Формат файла: { "gork": "refresh_token=...; ...", "gork_1": "..." } или { "gork": { "refresh_token": "..." }, ... }
 *
 * @param {string} filePath — путь к файлу (например .cookies.mirrors)
 * @param {string} projectRoot — корень проекта; для каждого аккаунта сохраняются .cookies.mirrors.<key> и .env.mirrors.<key> при refresh
 * @param {Object} baseOptions — общие опции для ITDClient (baseUrl, requestTimeout и т.д.)
 * @returns {Array<Object>} массив опций для ITDClient
 */
function loadMirrorsFromFile(filePath, projectRoot, baseOptions = {}) {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Файл зеркал не найден: ${fullPath}`);
    }
    const raw = fs.readFileSync(fullPath, 'utf8').trim();
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        throw new Error(`Файл зеркал должен быть валидным JSON: ${fullPath}`);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Файл зеркал должен содержать объект с ключами-аккаунтами');
    }
    const keys = Object.keys(data);
    if (keys.length === 0) {
        throw new Error('В файле зеркал должен быть хотя бы один аккаунт');
    }
    return keys.map((key) => {
        const cookieString = toCookieString(data[key]);
        if (!cookieString) {
            throw new Error(`Зеркало "${key}": нужна строка cookies или объект с refresh_token`);
        }
        return {
            ...baseOptions,
            projectRoot,
            cookiesString,
            cookiesPath: path.join(projectRoot, `.cookies.mirrors.${key}`),
            envPath: path.join(projectRoot, `.env.mirrors.${key}`),
        };
    });
}

/**
 * Создаёт пул клиентов (зеркал).
 *
 * Распределение запросов — автоматическое: каждый вызов метода (getNotifications, addComment и т.д.)
 * выполняется через следующий клиент в пуле по кругу. Ручной выбор: вызовите pool.getClient() и
 * используйте возвращённый клиент для нескольких операций подряд.
 *
 * @param {Array<ITDClient|Object>|Object} configsOrOptions — либо массив конфигов/клиентов, либо объект:
 *   { mirrorsCookiesPath: string, projectRoot?: string, baseOptions?: Object } — один файл с куками для всех зеркал (JSON).
 * @returns {Proxy} Объект с тем же API, что и ITDClient.
 *
 * @example
 * // Вариант 1: один файл .cookies.mirrors с несколькими аккаунтами (JSON)
 * const pool = createMirrorPool({
 *   mirrorsCookiesPath: '.cookies.mirrors',
 *   projectRoot: process.cwd(),
 *   baseOptions: { baseUrl: 'https://xn--d1ah4a.com' },
 * });
 *
 * @example
 * // Вариант 2: отдельные файлы cookies на каждый аккаунт
 * const pool = createMirrorPool([
 *   { cookiesPath: '.cookies_gork', envPath: '.env_gork' },
 *   { cookiesPath: '.cookies_gork_1', envPath: '.env_gork_1' },
 * ]);
 *
 * await pool.getNotifications(20);  // автоматически — с очередного аккаунта
 * await pool.addComment(postId, 'Ответ');
 *
 * // Ручной режим: один аккаунт на несколько операций
 * const client = pool.getClient();
 * await client.getNotifications(10);
 * await client.addComment(postId, 'Ответ от этого аккаунта');
 */
export function createMirrorPool(configsOrOptions) {
    let configs;

    if (Array.isArray(configsOrOptions)) {
        if (configsOrOptions.length === 0) {
            throw new TypeError('createMirrorPool(configs): configs не должен быть пустым');
        }
        configs = configsOrOptions;
    } else if (configsOrOptions && typeof configsOrOptions === 'object') {
        const opts = configsOrOptions;
        if (!opts.mirrorsCookiesPath) {
            throw new TypeError('createMirrorPool({ mirrorsCookiesPath }): укажите mirrorsCookiesPath');
        }
        const projectRoot = opts.projectRoot ?? process.cwd();
        configs = loadMirrorsFromFile(opts.mirrorsCookiesPath, projectRoot, opts.baseOptions ?? {});
    } else {
        throw new TypeError('createMirrorPool: передайте массив конфигов или объект { mirrorsCookiesPath }');
    }

    const clients = configs.map((c) =>
        c instanceof ITDClient ? c : new ITDClient(c)
    );

    let index = 0;
    function nextClient() {
        const client = clients[index % clients.length];
        index += 1;
        return client;
    }

    function makeManagerProxy(propName) {
        return new Proxy(
            {},
            {
                get(_, method) {
                    const c = nextClient();
                    const manager = c[propName];
                    const fn = manager && typeof manager[method] === 'function' ? manager[method] : undefined;
                    if (fn) {
                        return function (...args) {
                            return fn.apply(manager, args);
                        };
                    }
                    return manager ? manager[method] : undefined;
                }
            }
        );
    }

    const pool = new Proxy(
        {},
        {
            get(target, prop) {
                if (prop === 'getClient' || prop === 'nextClient') {
                    return () => nextClient();
                }
                if (prop === 'clients') {
                    return clients;
                }
                if (prop === 'size') {
                    return clients.length;
                }

                const ref = clients[0];
                const value = ref[prop];

                if (MANAGER_KEYS.has(prop)) {
                    return makeManagerProxy(prop);
                }
                if (typeof value === 'function') {
                    return function (...args) {
                        const c = nextClient();
                        return value.apply(c, args);
                    };
                }
                return nextClient()[prop];
            }
        }
    );

    return pool;
}
