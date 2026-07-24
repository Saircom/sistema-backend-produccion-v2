import express from 'express';
import ImageController from './image.controller.js';
import upload from '../../../utils/multer.js';

const router = express.Router();

router.post(
    '/informe/:idInforme/imagenes',
    upload.array('imagenes', 10),
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