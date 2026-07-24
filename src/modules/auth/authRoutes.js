import express from 'express';
import { 
    login, 
    restablecerContrasena, 
    validateToken 
} from './authController.js'; // Es vital incluir la extensión .js en ESM
import authMiddleware from '../../middleware/authMiddleware.js';
import { createRateLimiter } from '../../middleware/security.middleware.js';

const router = express.Router();

// Ruta para el login
router.post('/login', createRateLimiter({ windowMs: 15 * 60_000, max: 8 }), login);


// Ruta para restablecer la contraseña
router.post('/restablecer-contrasena', createRateLimiter({ windowMs: 15 * 60_000, max: 5 }), restablecerContrasena);

// Ruta para validar el token y obtener datos del usuario
router.get('/validate', authMiddleware, validateToken);

export default router;
