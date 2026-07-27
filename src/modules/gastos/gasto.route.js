import { Router } from 'express';
import multer from 'multer';
import { gastoController } from './gasto.controller.js';
import { procesarRecibo } from './iaController.js';

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const permitidos = new Set(['image/jpeg', 'image/png', 'image/webp']);
        callback(permitidos.has(file.mimetype) ? null : new Error('Solo se permiten imágenes JPG, PNG o WEBP'), permitidos.has(file.mimetype));
    }
});


// --- Rutas ---
router.get('/', gastoController.listar);
router.get('/operativos', gastoController.obtenerOperativos);
router.get('/servicio/:idServicio', gastoController.obtenerPorServicio);

router.post('/procesar-recibo', upload.single('imagen'), procesarRecibo);
router.post('/', gastoController.crear);

router.put('/cabecera/:idGasto', gastoController.actualizarCabecera);
router.put('/detalle/:idDetalle', gastoController.actualizarDetalle);

router.delete('/detalle/:idDetalle', gastoController.eliminarDetalle);
router.delete('/:idGasto', gastoController.eliminar);

export default router;
