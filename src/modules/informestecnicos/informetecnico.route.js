import { Router } from 'express';
import informetecnicoControlller from './informetecnico.controller.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const router = Router();

/**
 * GET /api/informes
 * Lista todos los informes técnicos
 */
router.get('/reporte-servicios-export', authMiddleware, informetecnicoControlller.getReporteServiciosExport);
router.get('/', authMiddleware, informetecnicoControlller.getAll);
router.patch('/:idInforme/estado-revision', authMiddleware, informetecnicoControlller.updateEstadoRevision);
router.patch('/:idInforme/estado-envio', authMiddleware, informetecnicoControlller.updateEstadoEnvio);

export default router;
