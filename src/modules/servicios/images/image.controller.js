import ImageService from './image.service.js';

const obtenerStatus = error => error?.statusCode || (error?.message === 'Imagen no encontrada' ? 404 : 500);
const responderError = (res, error, mensaje) => res.status(obtenerStatus(error)).json({ error: error?.message || mensaje });

const normalizarTitulos = valor => {
    if (Array.isArray(valor)) return valor;
    if (valor === undefined || valor === null || valor === '') return [];
    return [valor];
};

const ImageController = {
    async uploadImage(req, res) {
        try {
            const { idInforme } = req.params;

            if (req.fileValidationError) {
                return res.status(400).json({ error: req.fileValidationError });
            }

            if (!req.file?.buffer) {
                return res.status(400).json({
                    error: 'Falta el archivo de imagen obligatorio'
                });
            }

            const titulo = String(
                req.body.titulo || req.file.originalname || 'Evidencia'
            ).trim();

            const imagen = await ImageService.uploadImage({
                id_informe: idInforme,
                titulo,
                fileBuffer: req.file.buffer
            });

            return res.status(201).json({
                message: 'Imagen subida correctamente',
                imagen
            });
        } catch (error) {
            console.error('Error en uploadImage:', error);
            return responderError(
                res,
                error,
                'Error al subir la imagen'
            );
        }
    }, 

    async uploadImages(req, res) {
        try {
            const { idInforme } = req.params;

            console.log('===== UPLOAD IMAGES CONTROLLER =====');
            console.log('ID informe:', idInforme);
            console.log('Body recibido:', req.body);
            console.log('Files recibidos:', req.files?.length || 0);

            if (req.fileValidationError) {
                console.error(
                    'Error de validación:',
                    req.fileValidationError
                );

                return res.status(400).json({
                    error: req.fileValidationError
                });
            }

            const archivos = Array.isArray(req.files)
                ? req.files
                : [];

            if (archivos.length === 0) {
                return res.status(400).json({
                    error: 'Debe seleccionar al menos una imagen'
                });
            }

            /*
             * El frontend envía:
             *
             * titulo = título imagen 1
             * titulo = título imagen 2
             *
             * Con una imagen, req.body.titulo será string.
             * Con varias imágenes, req.body.titulo será array.
             */
            const titulos = normalizarTitulos(
                req.body.titulo
            ).map(titulo =>
                String(titulo || '').trim()
            );

            console.log('Títulos normalizados:', titulos);

            archivos.forEach((archivo, index) => {
                console.log(`Archivo ${index + 1}:`, {
                    nombre: archivo.originalname,
                    tipo: archivo.mimetype,
                    tamaño: archivo.size,
                    tieneBuffer: Boolean(
                        archivo.buffer
                    ),
                    titulo: titulos[index]
                });
            });

            if (titulos.length !== archivos.length) {
                return res.status(400).json({
                    error:
                        `La cantidad de títulos no coincide con las imágenes. ` +
                        `Imágenes: ${archivos.length}, títulos: ${titulos.length}`
                });
            }

            const tituloVacio = titulos.findIndex(
                titulo => !titulo
            );

            if (tituloVacio !== -1) {
                return res.status(400).json({
                    error: `La imagen ${tituloVacio + 1} no tiene título`
                });
            }

            const resultado =
                await ImageService.uploadImages({
                    id_informe: Number(idInforme),
                    archivos,
                    titulos
                });

            return res.status(201).json({
                message: `${resultado.cantidad} imágenes subidas correctamente`,
                cantidad: resultado.cantidad,
                imagenes: resultado.imagenes
            });
        } catch (error) {
            console.error(
                '===== ERROR UPLOAD IMAGES ====='
            );
            console.error('Mensaje:', error.message);
            console.error('Stack:', error.stack);
            console.error('Error completo:', error);

            return responderError(
                res,
                error,
                'Error al subir las imágenes'
            );
        }
    },

    async getImagesByInforme(req, res) {
        try {
            const { idInforme } = req.params;

            const imagenes =
                await ImageService.getImagesByInforme(idInforme);

            return res.json(imagenes ?? []);
        } catch (error) {
            console.error('Error en getImagesByInforme:', error);
            return responderError(
                res,
                error,
                'Error al obtener las imágenes'
            );
        }
    },

    async reemplazarImage(req, res) {
        try {
            const { idImagen } = req.params;

            if (req.fileValidationError) {
                return res.status(400).json({
                    error: req.fileValidationError
                });
            }

            if (!req.file?.buffer) {
                return res.status(400).json({
                    error: 'Debe seleccionar la nueva imagen'
                });
            }

            const imagen = await ImageService.reemplazarImage({
                id_imagen: idImagen,
                fileBuffer: req.file.buffer
            });

            return res.json({
                message: 'Imagen reemplazada correctamente',
                imagen
            });
        } catch (error) {
            console.error('Error en reemplazarImage:', error);
            return responderError(
                res,
                error,
                'Error al reemplazar la imagen'
            );
        }
    },

    async deleteImage(req, res) {
        try {
            const { idImagen } = req.params;

            await ImageService.deleteImage(idImagen);

            return res.json({
                message: 'Imagen eliminada correctamente',
                id_imagen: Number(idImagen)
            });
        } catch (error) {
            console.error('Error en deleteImage:', error);
            return responderError(
                res,
                error,
                'Error al eliminar la imagen'
            );
        }
    },

    async updateTitulo(req, res) {
        try {
            const { idImagen } = req.params;
            const titulo = String(req.body.titulo || '').trim();

            if (!titulo) {
                return res.status(400).json({
                    error: 'El título es obligatorio'
                });
            }

            const resultado =
                await ImageService.updateTitulo(idImagen, titulo);

            return res.json({
                message: 'Título actualizado correctamente',
                imagen: resultado
            });
        } catch (error) {
            console.error('Error en updateTitulo:', error);
            return responderError(
                res,
                error,
                'Error al actualizar el título'
            );
        }
    },

    async rotarImage(req, res) {
        try {
            const { idImagen } = req.params;
            const grados = req.body.grados ?? 90;

            const imagen =
                await ImageService.rotarImage(idImagen, grados);

            return res.json({
                message: 'Imagen rotada correctamente',
                imagen
            });
        } catch (error) {
            console.error('Error en rotarImage:', error);
            return responderError(
                res,
                error,
                'Error al rotar la imagen'
            );
        }
    }
};

export default ImageController;