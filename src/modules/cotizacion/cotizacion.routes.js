import express from 'express';
import controller from './cotizacion.controller.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import { hasAnyRole } from '../../utils/roles.js';

const router = express.Router();

const permitirRoles = (...rolesPermitidos) => (req, res, next) => {
    if (!hasAnyRole(req.user, ...rolesPermitidos)) {
        return res.status(403).json({
            success: false,
            message: 'No tiene permisos para actualizar el estado de la cotización'
        });
    }
    next();
};

// Ruta para crear cotización (Protegida)
router.post('/', authMiddleware, controller.postCotizacion);

// Ruta para obtener todas las cotizaciones (Protegida)
router.get('/', authMiddleware, controller.getAllCotizaciones);

router.patch(
    '/:id/estado',
    authMiddleware,
    permitirRoles('POSTVENTA', 'ADMINISTRADOR'),
    controller.updateEstado
);

router.put(
    '/:id',
    authMiddleware,
    permitirRoles('POSTVENTA', 'ADMINISTRADOR'),
    controller.updateCotizacion
);

// Ruta para obtener una cotización específica por ID (Protegida)
router.get('/:id', controller.getCotizacionById);

export default router;
