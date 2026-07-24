import { Router } from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import { viaticoController } from './viatico.controller.js';
import upload from '../../utils/multer.js';

const router = Router();
router.use(authMiddleware);
router.get('/admin', viaticoController.listarAdmin);
router.get('/mis-pendientes', viaticoController.misPendientes);
router.get('/catalogos', viaticoController.catalogos);
router.get('/ot/:idOt', viaticoController.listar);
router.post(
    '/ot/:idOt/comprobante',
    upload.single('imagenes'),
    viaticoController.subirComprobante
);
router.post('/ot/:idOt', viaticoController.crear);
router.put('/:idViatico', viaticoController.actualizar);
router.patch('/:idViatico/estado', viaticoController.cambiarEstado);
router.delete('/:idViatico', viaticoController.eliminar);

export default router;
