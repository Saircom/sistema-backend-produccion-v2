// src/modules/tiempos/tiempo.routes.js
import express from 'express';
import TiempoController from './tiempo.controller.js';

const router = express.Router();

router.get('/', TiempoController.listar);

/**
 * Obtener los tiempos de un equipo dentro de una OT.
 */
router.get(
    '/:id_ot_detalle',
    TiempoController.obtener
);

/**
 * Registrar llegada.
 */
router.patch(
    '/:id_ot_detalle/llegada',
    TiempoController.registrarLlegada
);

/**
 * Registrar inicio.
 */
router.patch(
    '/:id_ot_detalle/inicio',
    TiempoController.registrarInicio
);

/**
 * Registrar fin.
 */
router.patch(
    '/:id_ot_detalle/fin',
    TiempoController.registrarFin
);

export default router;
