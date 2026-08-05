import ImageModel from './image.model.js';
import cloudinary from '../../../config/cloudinary.js';
import sharp from 'sharp';

const CARPETA = 'imagenes_informe';
const MAX_IMAGENES_POR_CARGA = 50;

const subirBuffer = buffer => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
        {
            folder: CARPETA,
            resource_type: 'image',
            format: 'jpg',
            quality: 'auto:good'
        },
        (error, resultado) => error ? reject(error) : resolve(resultado)
    );

    stream.end(buffer);
});

const optimizarImagen = async fileBuffer => {
    if (!Buffer.isBuffer(fileBuffer)) throw new Error('El archivo de imagen no es válido');

    return sharp(fileBuffer)
        .rotate()
        .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .jpeg({
            quality: 80,
            progressive: true,
            mozjpeg: true
        })
        .toBuffer();
};

const procesarYSubir = async fileBuffer => {
    const imagenOptimizada = await optimizarImagen(fileBuffer);
    return subirBuffer(imagenOptimizada);
};

export const subirImagenCloudinary = async fileBuffer => {
    const resultado = await procesarYSubir(fileBuffer);
    return {
        secure_url: resultado.secure_url,
        public_id: resultado.public_id
    };
};

const validarId = (valor, campo) => {
    const id = Number(valor);

    if (!Number.isInteger(id) || id <= 0) {
        const error = new Error(`${campo} no es válido`);
        error.statusCode = 400;
        throw error;
    }

    return id;
};

const validarCupoInforme = async (idInforme, cantidadNueva) => {
    const registradas = await ImageModel.findByInforme(idInforme);
    const totalActual = Array.isArray(registradas) ? registradas.length : 0;

    if (totalActual + cantidadNueva > MAX_IMAGENES_POR_CARGA) {
        const disponibles = Math.max(0, MAX_IMAGENES_POR_CARGA - totalActual);
        const error = new Error(
            `El informe permite hasta ${MAX_IMAGENES_POR_CARGA} imágenes. Puede agregar ${disponibles} más.`
        );
        error.statusCode = 400;
        throw error;
    }
};

const eliminarCloudinary = async publicId => {
    if (!publicId) return;

    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image',
            invalidate: true
        });
    } catch (error) {
        console.error('No se pudo eliminar la imagen de Cloudinary:', error);
    }
};

const ImageService = {
    async uploadImage({ id_informe, titulo, fileBuffer }) {
        const idInforme = validarId(id_informe, 'El ID del informe');
        await validarCupoInforme(idInforme, 1);
        const cloudRes = await procesarYSubir(fileBuffer);

        try {
            const resultado = await ImageModel.create(
                idInforme,
                String(titulo || 'Evidencia').trim().slice(0, 100),
                cloudRes.secure_url,
                cloudRes.public_id
            );

            return {
                id_imagen: resultado.insertId,
                id_informe: idInforme,
                titulo: String(titulo || 'Evidencia').trim().slice(0, 100),
                url_imagen: cloudRes.secure_url,
                public_id: cloudRes.public_id
            };
        } catch (error) {
            await eliminarCloudinary(cloudRes.public_id);
            throw error;
        }
    },

    async uploadImages({ id_informe, archivos = [], titulo = '', titulos = [] }) {
        const idInforme = validarId(id_informe, 'El ID del informe');

        if (!Array.isArray(archivos) || archivos.length === 0) {
            const error = new Error('Debe seleccionar al menos una imagen');
            error.statusCode = 400;
            throw error;
        }

        if (archivos.length > MAX_IMAGENES_POR_CARGA) {
            const error = new Error(
                `Solo se permiten hasta ${MAX_IMAGENES_POR_CARGA} imágenes por carga`
            );
            error.statusCode = 400;
            throw error;
        }

        await validarCupoInforme(idInforme, archivos.length);

        const imagenesSubidas = [];
        const imagenesGuardadas = [];

        try {
            for (let index = 0; index < archivos.length; index += 1) {
                const archivo = archivos[index];

                if (!archivo?.buffer) {
                    throw new Error(`La imagen ${index + 1} no contiene datos válidos`);
                }

                const cloudRes = await procesarYSubir(archivo.buffer);
                imagenesSubidas.push(cloudRes.public_id);

                const tituloImagen = String(
                    titulos[index] ||
                    titulo ||
                    archivo.originalname ||
                    `Evidencia ${index + 1}`
                ).trim().slice(0, 100);

                const resultado = await ImageModel.create(
                    idInforme,
                    tituloImagen,
                    cloudRes.secure_url,
                    cloudRes.public_id
                );

                imagenesGuardadas.push({
                    id_imagen: resultado.insertId,
                    id_informe: idInforme,
                    titulo: tituloImagen,
                    url_imagen: cloudRes.secure_url,
                    public_id: cloudRes.public_id
                });
            }

            return {
                cantidad: imagenesGuardadas.length,
                imagenes: imagenesGuardadas
            };
        } catch (error) {
            await Promise.allSettled(
                imagenesGuardadas.map(imagen =>
                    ImageModel.delete(imagen.id_imagen)
                )
            );

            await Promise.allSettled(
                imagenesSubidas.map(publicId =>
                    eliminarCloudinary(publicId)
                )
            );

            throw error;
        }
    },

    async getImagesByInforme(id_informe) {
        const idInforme = validarId(id_informe, 'El ID del informe');
        return ImageModel.findByInforme(idInforme);
    },

    async reemplazarImage({ id_imagen, fileBuffer }) {
        const idImagen = validarId(id_imagen, 'El ID de la imagen');
        const imagenActual = await ImageModel.findById(idImagen);

        if (!imagenActual) {
            const error = new Error('Imagen no encontrada');
            error.statusCode = 404;
            throw error;
        }

        const cloudRes = await procesarYSubir(fileBuffer);

        try {
            const actualizado = await ImageModel.updateImage(
                idImagen,
                cloudRes.secure_url,
                cloudRes.public_id
            );

            if (!actualizado) throw new Error('No se pudo actualizar la imagen en la base de datos');

            await eliminarCloudinary(imagenActual.public_id);

            return {
                id_imagen: idImagen,
                url_imagen: cloudRes.secure_url,
                public_id: cloudRes.public_id
            };
        } catch (error) {
            await eliminarCloudinary(cloudRes.public_id);
            throw error;
        }
    },

    async deleteImage(id_imagen) {
        const idImagen = validarId(id_imagen, 'El ID de la imagen');
        const imagen = await ImageModel.findById(idImagen);

        if (!imagen) {
            const error = new Error('Imagen no encontrada');
            error.statusCode = 404;
            throw error;
        }

        const eliminado = await ImageModel.delete(idImagen);

        if (!eliminado) throw new Error('La imagen no pudo eliminarse de la base de datos');

        await eliminarCloudinary(imagen.public_id);

        return true;
    },

    async updateTitulo(id_imagen, nuevoTitulo) {
        const idImagen = validarId(id_imagen, 'El ID de la imagen');
        const imagen = await ImageModel.findById(idImagen);

        if (!imagen) {
            const error = new Error('Imagen no encontrada');
            error.statusCode = 404;
            throw error;
        }

        const titulo = String(nuevoTitulo || '').trim().slice(0, 100);

        if (!titulo) {
            const error = new Error('El título es obligatorio');
            error.statusCode = 400;
            throw error;
        }

        const actualizado = await ImageModel.updateTitulo(idImagen, titulo);

        if (!actualizado) throw new Error('No se pudo actualizar el título');

        return {
            id_imagen: idImagen,
            titulo
        };
    },

    async rotarImage(id_imagen, grados = 90) {
        const idImagen = validarId(id_imagen, 'El ID de la imagen');
        const angulo = Number(grados);

        if (![90, 180, 270, -90].includes(angulo)) {
            const error = new Error('Los grados permitidos son 90, 180, 270 o -90');
            error.statusCode = 400;
            throw error;
        }

        const imagenActual = await ImageModel.findById(idImagen);

        if (!imagenActual) {
            const error = new Error('Imagen no encontrada');
            error.statusCode = 404;
            throw error;
        }

        const response = await fetch(imagenActual.url_imagen);

        if (!response.ok) {
            throw new Error('No se pudo descargar la imagen para rotarla');
        }

        const bufferOriginal = Buffer.from(await response.arrayBuffer());

        const bufferRotado = await sharp(bufferOriginal)
            .rotate(angulo)
            .resize(1200, 1200, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({
                quality: 80,
                progressive: true,
                mozjpeg: true
            })
            .toBuffer();

        const cloudRes = await subirBuffer(bufferRotado);

        try {
            const actualizado = await ImageModel.updateImage(
                idImagen,
                cloudRes.secure_url,
                cloudRes.public_id
            );

            if (!actualizado) {
                throw new Error('No se pudo actualizar la imagen rotada en la base de datos');
            }

            await eliminarCloudinary(imagenActual.public_id);

            return {
                id_imagen: idImagen,
                url_imagen: cloudRes.secure_url,
                public_id: cloudRes.public_id,
                grados: angulo
            };
        } catch (error) {
            await eliminarCloudinary(cloudRes.public_id);
            throw error;
        }
    }
};

export default ImageService;
