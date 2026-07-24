// src/modules/equipos/equipos.routes.js
import { Router } from 'express';
import { equiposController } from './equipo.controller.js';

const router = Router();

// Catálogos (debe ir primero)
router.get('/marcas', equiposController.getMarcas);

// Rutas Generales
router.get('/', equiposController.getAll);
router.get('/cliente/:id_cliente', equiposController.getByClient);

// Rutas Operativas (Vinculadas a Cliente)
router.get('/:id', equiposController.getDetails);
router.post('/', equiposController.create); // El cuerpo del request debe incluir id_cliente
router.put('/:id', equiposController.update);
router.delete('/:id', equiposController.delete);

export default router;