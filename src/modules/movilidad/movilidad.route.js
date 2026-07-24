// src/modules/movilidad/movilidad.routes.js

import { Router } from 'express';
import { movilidadController } from './movilidad.controller.js';
import upload from '../../middleware/upload.js';

const router = Router();


// --- OPERACIONES CRUD BÁSICAS ---

router.get(
    '/',
    movilidadController.getAll
);


router.get(
    '/:id',
    movilidadController.getById
);


router.post(
    '/',
    movilidadController.createMovilidad
);


router.put(
    '/:id',
    movilidadController.update
);


router.delete(
    '/:id',
    movilidadController.delete
);



// --- MANTENIMIENTOS ---

router.post(
    '/:id/mantenimiento',
    movilidadController.addMantenimiento
);



// --- DOCUMENTOS CLOUDINARY ---

router.post(
    '/:id/documento',
    upload.single('archivo'),
    movilidadController.addDocumento
);



export default router;