import { Router } from 'express';
import { otController } from './ot.controller.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import { hasAnyRole } from '../../utils/roles.js';

const router = Router();

const permitirRoles = (...rolesPermitidos) => (req, res, next) => {
    if (!hasAnyRole(req.user, ...rolesPermitidos)) {
        return res.status(403).json({
            success: false,
            message: 'No tiene permisos para actualizar el estado de la Orden de Trabajo'
        });
    }

    next();
};

/*
|--------------------------------------------------------------------------
| COTIZACIONES DISPONIBLES
|--------------------------------------------------------------------------
*/

router.get(
    '/cotizaciones-disponibles',
    otController.getAll
);

router.get(
    '/cotizaciones/:idCotizacion',
    otController.getCotizacionById
);

/*
|--------------------------------------------------------------------------
| ORDENES DE TRABAJO
|--------------------------------------------------------------------------
*/

router.get(
    '/',
    otController.getOrdenes
);

router.get(
    '/:idOt',
    otController.getOrdenById
);

router.post(
    '/',
    otController.create
);

router.patch(
    '/:idOt/estado',
    authMiddleware,
    permitirRoles('ADMINISTRADOR', 'PLANNER'),
    otController.updateEstado
);

router.put(
    '/:idOt/programacion',
    authMiddleware,
    permitirRoles('SUPERADMINISTRADOR'),
    otController.updateProgramacion
);

/*
|--------------------------------------------------------------------------
| DETALLES DE LA OT
|--------------------------------------------------------------------------
*/

router.patch(
    '/detalles/:idOtDetalle/estado',
    otController.updateEstadoEquipo
);

router.patch(
    '/detalles/:idOtDetalle/tiempos',
    otController.updateTiempos
);

/*
|--------------------------------------------------------------------------
| ELIMINAR OT
|--------------------------------------------------------------------------
*/

router.delete(
    '/:idOt',
    otController.delete
);

export default router;
