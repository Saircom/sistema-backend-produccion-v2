// src/modules/equipos/equipos.routes.js
import { Router } from 'express';
import { tiposervicioController } from './tiposervicio.controller.js';

const router = Router();

// Ruta para obtener todos los tipos de servicio
router.get('/tipos-servicio', tiposervicioController.getAll);

// Ruta para obtener los subtipos filtrados por el ID de un tipo de servicio
// El parámetro :id capturará el valor enviado desde el frontend
router.get('/subtipos/:id', tiposervicioController.getByTipo);

export default router;