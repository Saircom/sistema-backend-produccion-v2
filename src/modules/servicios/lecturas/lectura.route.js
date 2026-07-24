import { Router } from 'express';
import { lecturasController } from './lectura.controller.js';

const router = Router();

// 1. Ruta para crear nuevas lecturas (POST)
router.post('/servicios/:id', lecturasController.create);

// 2. Ruta para actualizar lecturas existentes (PUT)
// Usamos el mismo controlador porque la lógica de 'upsert' (actualizar o crear) 
// ya está manejada por el servicio.
router.put('/servicios/:id', lecturasController.update);

export default router;