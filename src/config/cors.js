const configuredOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

const defaultOrigins = [
    'https://intranet.saircomperu.com.pe',
    'https://sistema-frontend-produccion-v2-production-cde0.up.railway.app',
    'https://sistema-frontend-produccion-v2-production-7446.up.railway.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
];

export const allowedOrigins = [...new Set([...configuredOrigins, ...defaultOrigins])];

const isPrivateViteOrigin = (origin) => {
    if (process.env.CORS_ALLOW_LOCAL_NETWORK === 'false') return false;

    try {
        const url = new URL(origin);
        if (url.protocol !== 'http:' || !['5173', '5174'].includes(url.port)) return false;

        const host = url.hostname;
        if (/^192\.168\.(?:\d{1,3})\.(?:\d{1,3})$/.test(host)) return true;
        if (/^10\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host)) return true;

        const match172 = host.match(/^172\.(\d{1,3})\.(?:\d{1,3})\.(?:\d{1,3})$/);
        return Boolean(match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31);
    } catch {
        return false;
    }
};

export const isOriginAllowed = (origin) => {
    if (!origin) return true;
    if (process.env.CORS_ORIGIN === '*') return true;
    const cleanOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(cleanOrigin)) return true;
    if (isPrivateViteOrigin(origin)) return true;
    try {
        const url = new URL(cleanOrigin);
        if (url.hostname.endsWith('.railway.app')) return true;
    } catch {}
    return false;
};

export const corsOrigin = (origin, callback) => {
    if (isOriginAllowed(origin)) return callback(null, true);
    return callback(Object.assign(new Error('Origen no permitido por CORS'), { status: 403 }));
};
