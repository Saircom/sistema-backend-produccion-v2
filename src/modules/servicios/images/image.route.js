import express from 'express';
import ImageController from './image.controller.js';
import upload from '../../../utils/multer.js';

const router = express.Router();
const MAX_IMAGENES_POR_INFORME = 50;

router.post(
    '/informe/:idInforme/imagenes',
    upload.array('imagenes', MAX_IMAGENES_POR_INFORME),
    ImageController.uploadImages
);

router.post(
    '/informe/:idInforme/imagen',
    upload.single('imagen'),
    ImageController.uploadImage
);

router.get(
    '/informe/:idInforme/imagenes',
    ImageController.getImagesByInforme
);

router.put(
    '/:idImagen/reemplazar',
    upload.single('imagen'),
    ImageController.reemplazarImage
);

router.delete(
    '/:idImagen',
    ImageController.deleteImage
);

router.patch(
    '/:idImagen/titulo',
    ImageController.updateTitulo
);

router.patch(
    '/:idImagen/rotar',
    ImageController.rotarImage
);

export default router;
