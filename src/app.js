import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes.js'; // Es obligatorio incluir el .js al final
import { realtimeMutationMiddleware } from './realtime/socket.js';
import { securityHeaders } from './middleware/security.middleware.js';

// Reemplazo moderno para emular __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
app.use(securityHeaders);

// Configuración de CORS
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(Object.assign(new Error('Origen no permitido por CORS'), { status: 403 }));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Socket-Id'],
    maxAge: 600
}));

// Middleware para JSON y formularios
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '1mb', parameterLimit: 100 }));

// Servir archivos estáticos (Usa el __dirname que calculamos arriba)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Publicar en tiempo real toda mutación HTTP exitosa del sistema.
app.use('/api', realtimeMutationMiddleware);
app.use('/api', routes);

// Ruta principal de verificación
app.get('/', (req, res) => {
    res.send('✅ Servidor de API en funcionamiento 🚀');
});

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
    console.error("❌ Error:", err.message);
    res.status(err.status || 500).json({
        message: err.message || 'Error interno del servidor'
    });
});

export default app;
