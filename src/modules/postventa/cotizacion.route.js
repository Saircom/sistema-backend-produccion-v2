import { Router } from 'express';
import { cotizacionController } from './cotizacion.controller.js';

const router = Router();

router.get('/', cotizacionController.getAll);
router.put('/estado/:id_servicio', cotizacionController.updateEstado);

export default router;