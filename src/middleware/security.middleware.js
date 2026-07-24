import { hasAnyRole } from '../utils/roles.js';

export const requireRoles = (...roles) => (req, res, next) => {
    if (!hasAnyRole(req.user, ...roles)) {
        return res.status(403).json({ error: 'No tiene permisos para realizar esta operación' });
    }
    next();
};

export const requireSelfOrRoles = (paramName, ...roles) => (req, res, next) => {
    if (hasAnyRole(req.user, ...roles)) return next();
    const requestedId = Number(req.params[paramName]);
    if (!Number.isInteger(requestedId) || requestedId !== Number(req.user?.id_usuario)) {
        return res.status(403).json({ error: 'No puede acceder a información de otro usuario' });
    }
    next();
};

export const validateNumericParams = (req, res, next) => {
    for (const [name, rawValue] of Object.entries(req.params || {})) {
        if (!/^id/i.test(name)) continue;
        const value = String(rawValue);
        if (!/^\d+$/.test(value) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) {
            return res.status(400).json({ error: `Parámetro ${name} inválido` });
        }
    }
    next();
};

export const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    res.removeHeader('X-Powered-By');
    next();
};

export const createRateLimiter = ({ windowMs = 15 * 60_000, max = 10 } = {}) => {
    const attempts = new Map();
    return (req, res, next) => {
        const now = Date.now();
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        const entry = attempts.get(key);
        if (!entry || entry.resetAt <= now) {
            attempts.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }
        entry.count += 1;
        if (entry.count > max) {
            res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
            return res.status(429).json({ error: 'Demasiados intentos. Intente nuevamente más tarde.' });
        }
        next();
    };
};
