// src/modules/informes/informes.routes.js
import { Router } from 'express';
import {
    informesController
} from './informe.controller.js';
import { requireRoles, requireSelfOrRoles } from '../../middleware/security.middleware.js';

const router = Router();

/**
 * =========================================================
 * RUTAS PARA TÉCNICO
 * =========================================================
 */

/**
 * Obtiene el informe completo validando que
 * el detalle pertenezca al técnico.
 *
 * GET:
 * /api/informes/tecnico/:idTecnico/detalles/:idOtDetalle
 */
router.get(
    '/tecnico/:idTecnico/detalles/:idOtDetalle',
    requireSelfOrRoles('idTecnico', 'ADMINISTRADOR', 'PLANNER'),
    informesController.getByOtDetalleTecnico
);

/**
 * Guarda o actualiza el informe validando
 * que el detalle pertenezca al técnico.
 *
 * PUT:
 * /api/informes/tecnico/:idTecnico/detalles/:idOtDetalle
 */
router.put(
    '/tecnico/:idTecnico/detalles/:idOtDetalle',
    requireSelfOrRoles('idTecnico', 'ADMINISTRADOR', 'PLANNER'),
    informesController.guardarInformeTecnico
);

/**
 * Finaliza el informe validando al técnico.
 *
 * PATCH:
 * /api/informes/tecnico/:idTecnico/detalles/:idOtDetalle/finalizar
 */
router.patch(
    '/tecnico/:idTecnico/detalles/:idOtDetalle/finalizar',
    requireSelfOrRoles('idTecnico', 'ADMINISTRADOR', 'PLANNER'),
    informesController.finalizarTecnico
);

/**
 * =========================================================
 * RUTAS PARA ADMINISTRADOR / PLANNER
 * =========================================================
 */

/**
 * Obtiene el informe completo sin validar técnico.
 *
 * GET:
 * /api/informes/detalles/:idOtDetalle
 */
router.get(
    '/detalles/:idOtDetalle',
    requireRoles('ADMINISTRADOR', 'PLANNER', 'POSTVENTA'),
    informesController.getByOtDetalle
);

/**
 * Guarda o actualiza el informe sin validar técnico.
 *
 * PUT:
 * /api/informes/detalles/:idOtDetalle
 */
router.put(
    '/detalles/:idOtDetalle',
    requireRoles('ADMINISTRADOR', 'PLANNER'),
    informesController.guardarInforme
);

/**
 * Finaliza el informe sin validar técnico.
 *
 * PATCH:
 * /api/informes/detalles/:idOtDetalle/finalizar
 */
router.patch(
    '/detalles/:idOtDetalle/finalizar',
    requireRoles('ADMINISTRADOR', 'PLANNER'),
    informesController.finalizar
);

/**
 * =========================================================
 * HISTORIAL
 * =========================================================
 */

/**
 * Obtiene el historial del equipo.
 *
 * GET:
 * /api/informes/equipos/:idEquipo/historial
 *
 * Ejemplo:
 * /api/informes/equipos/279/historial?idOtDetalleActual=7
 */
router.get(
    '/equipos/:idEquipo/historial',
    informesController.getHistorialPorEquipo
);

/**
 * Obtiene el detalle completo de un informe histórico.
 *
 * GET:
 * /api/informes/historial/:idInforme
 */
router.get(
    '/historial/:idInforme',
    informesController.getHistorialDetalle
);

/**
 * =========================================================
 * INFORME POR ID
 * =========================================================
 */

/**
 * Obtiene un informe básico mediante id_informe.
 *
 * Debe permanecer al final para evitar que:
 * - tecnico
 * - detalles
 * - equipos
 * - historial
 *
 * sean interpretados como idInforme.
 *
 * GET:
 * /api/informes/:idInforme
 */
router.get(
    '/:idInforme',
    informesController.getById
);

export default router;
