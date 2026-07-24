import { Router } from 'express';
// ACTUALIZACIÓN: Importamos ambos controladores desde el archivo correspondiente
import { getDashboardStats, getTecnicoStats } from './dashboard.controller.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import { hasAnyRole } from '../../utils/roles.js';
import { requireSelfOrRoles } from '../../middleware/security.middleware.js';

const router = Router();

// 1. Ruta Global (Administrador / Supervisor)
// URL: GET /api/dashboard/stats
router.get('/stats', authMiddleware, (req,res,next)=>{ if(!hasAnyRole(req.user,'ADMINISTRADOR')) return res.status(403).json({error:'Acceso restringido al panel administrativo'}); next(); }, getDashboardStats);

// 2. NUEVA: Ruta Individual (Para cada Técnico)
// URL: GET /api/dashboard/stats/tecnico/12
router.get('/stats/tecnico/:id_usuario', authMiddleware, requireSelfOrRoles('id_usuario', 'ADMINISTRADOR', 'PLANNER'), getTecnicoStats);

export default router;
