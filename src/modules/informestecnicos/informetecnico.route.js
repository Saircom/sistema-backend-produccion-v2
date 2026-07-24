import { Router } from 'express';
import informetecnicoControlller from './informetecnico.controller.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const router = Router();

/**
 * GET /api/informes
 * Lista todos los informes técnicos
 */
router.get('/', authMiddleware, informetecnicoControlller.getAll);
router.patch('/:idInforme/estado-revision', authMiddleware, informetecnicoControlller.updateEstadoRevision);

export default router;
