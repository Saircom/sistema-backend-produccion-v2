import { Router } from 'express';
import { PerfilController } from './perfil.controller.js';

const router = Router();

router.get('/', PerfilController.obtener);
router.patch('/', PerfilController.actualizarDatos);
router.patch('/password', PerfilController.cambiarPassword);

export default router;
