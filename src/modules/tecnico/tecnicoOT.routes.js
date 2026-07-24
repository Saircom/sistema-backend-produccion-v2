// src/modules/tecnicoOT/tecnicoOT.routes.js
import { Router } from 'express';
import { tecnicoOTController } from './tecnicoOT.controller.js';
import { requireSelfOrRoles } from '../../middleware/security.middleware.js';

const router = Router();

/**
 * Pruebas temporales sin token.
 */

// Lista las OT asignadas al técnico
router.get(
    '/:idTecnico',
    requireSelfOrRoles('idTecnico', 'ADMINISTRADOR', 'PLANNER'),
    tecnicoOTController.getOrdenes
);

// Obtiene una OT completa del técnico
router.get(
    '/:idTecnico/ordenes/:idOt',
    requireSelfOrRoles('idTecnico', 'ADMINISTRADOR', 'PLANNER'),
    tecnicoOTController.getOrdenById
);

// Verifica que un detalle pertenezca al técnico
router.get(
    '/:idTecnico/detalles/:idOtDetalle',
    requireSelfOrRoles('idTecnico', 'ADMINISTRADOR', 'PLANNER'),
    tecnicoOTController.verificarDetalle
);

// Cambiar estado de un servicio
router.patch(
    '/:idTecnico/servicios/:idOtDetalleServicio',
    requireSelfOrRoles('idTecnico', 'ADMINISTRADOR', 'PLANNER'),
    tecnicoOTController.updateEstadoServicio
);

export default router;
