import jwt from 'jsonwebtoken';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SUPERVISOR_ROOMS = ['rol:PLANNER', 'rol:ADMINISTRADOR', 'rol:SUPERADMINISTRADOR'];

const uniquePositiveIds = values => [...new Set(values.map(Number).filter(id => Number.isInteger(id) && id > 0))];
const apiPath = req => req.originalUrl.split('?')[0].replace(/^\/api(?=\/|$)/, '').replace(/\/$/, '');

export const resolveNotification = req => {
    const path = apiPath(req);
    const body = req.body || {};

    if (/^\/tiempos\/\d+\/fin$/.test(path) || /^\/ordentrabajo\/detalles\/\d+\/tiempos$/.test(path)) {
        return { rooms: SUPERVISOR_ROOMS, type: 'TIEMPOS_COMPLETADOS', message: 'Un técnico completó el registro de horas de una OT' };
    }

    if (/^\/informes\/tecnico\/\d+\/detalles\/\d+\/finalizar$/.test(path)) {
        return { rooms: SUPERVISOR_ROOMS, type: 'INFORME_COMPLETADO', message: 'Un técnico finalizó un informe; está listo para revisión' };
    }

    if (/^\/cotizacion\/\d+\/estado$/.test(path) && String(body.estado || '').trim().toLowerCase() === 'aprobada') {
        return { rooms: SUPERVISOR_ROOMS, type: 'COTIZACION_APROBADA', message: 'Una cotización fue aprobada y está lista para programación' };
    }

    if (req.method === 'POST' && path === '/ordentrabajo') {
        const userIds = uniquePositiveIds([body.idTecnicoResponsable, ...(Array.isArray(body.idsTecnicosApoyo) ? body.idsTecnicosApoyo : [])]);
        if (userIds.length) return { rooms: userIds.map(id => `usuario:${id}`), type: 'OT_ASIGNADA', message: 'Se te asignó una nueva Orden de Trabajo' };
    }

    return null;
};

export const configureRealtime = io => {
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Token requerido'));

        try {
            socket.user = jwt.verify(token, process.env.JWT_SECRET);
            return next();
        } catch {
            return next(new Error('Token inválido o expirado'));
        }
    });

    io.on('connection', socket => {
        socket.join(`usuario:${socket.user.id_usuario}`);
        if (socket.user.rol) socket.join(`rol:${String(socket.user.rol).trim().toUpperCase()}`);
        console.log(`Cliente conectado: ${socket.user.id_usuario} (${socket.id})`);
        socket.on('disconnect', () => console.log(`Cliente desconectado: ${socket.id}`));
    });
};

export const realtimeMutationMiddleware = (req, res, next) => {
    if (!MUTATION_METHODS.has(req.method) || apiPath(req).startsWith('/auth/')) return next();

    res.once('finish', () => {
        if (res.statusCode < 200 || res.statusCode >= 400) return;
        const io = req.app.get('io');
        if (!io) return;

        const normalizedPath = apiPath(req);
        const supervisorTarget = () => SUPERVISOR_ROOMS.reduce((emitter, room) => emitter.to(room), io);
        if (req.method === 'POST' && normalizedPath === '/ordentrabajo') {
            supervisorTarget().emit('planner:pendientes-actualizados', { timestamp: new Date().toISOString() });
            supervisorTarget().emit('planner:ordenes-actualizadas', { timestamp: new Date().toISOString() });
        }
        if (req.method === 'PATCH' && /^\/ordentrabajo\/\d+\/estado$/.test(normalizedPath)) {
            supervisorTarget().emit('planner:ordenes-actualizadas', { timestamp: new Date().toISOString() });
        }
        const cambiaPendientesInforme = req.method === 'PATCH' && (
            /^\/informes\/(?:tecnico\/\d+\/)?detalles\/\d+\/finalizar$/.test(normalizedPath)
            || /^\/informe-tecnico\/\d+\/estado-revision$/.test(normalizedPath)
        );
        if (cambiaPendientesInforme) {
            supervisorTarget().emit('informes:pendientes-actualizados', { timestamp: new Date().toISOString() });
        }

        const notification = resolveNotification(req);
        if (!notification) return;

        const segments = normalizedPath.split('/').filter(Boolean);
        const entityId = segments.find(segment => /^\d+$/.test(segment)) || null;
        const payload = {
            resource: segments[0] || 'sistema',
            action: req.method,
            path: normalizedPath,
            entityId,
            type: notification.type,
            message: notification.message,
            userId: req.user?.id_usuario || null,
            timestamp: new Date().toISOString()
        };
        const sourceSocketId = req.get('x-socket-id');
        let target = notification.rooms.reduce((emitter, room) => emitter.to(room), io);
        if (sourceSocketId) target = target.except(sourceSocketId);
        target.emit('sistema:actualizado', payload);

    });

    next();
};
