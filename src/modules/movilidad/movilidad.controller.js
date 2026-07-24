import { movilidadService } from './movilidad.service.js';
import cloudinary from "../../config/cloudinary.js";
import streamifier from "streamifier";

export const movilidadController = {

    async createMovilidad(req, res) {
        try {
            const nuevaMovilidad = req.body;
            // Validaciones básicas
            if (!nuevaMovilidad.placa) {
                return res.status(400).json({ error: "La placa es obligatoria" });
            }

            const id = await movilidadService.createMovilidad(nuevaMovilidad);
            res.status(201).json({ message: "Movilidad registrada exitosamente", id });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    // --- MOVILIDADES ---
    async getAll(req, res) {
        try {
            const movilidades = await movilidadService.getAllMovilidades();
            res.status(200).json(movilidades);
        } catch (error) {
            res.status(500).json({ message: "Error al recuperar inventario", error: error.message });
        }
    },

    // CORREGIDO: Ahora usa getDetalleMovilidad que trae mantenimientos y docs
    async getById(req, res) {
        try {
            const movilidad = await movilidadService.getDetalleMovilidad(req.params.id);
            res.status(200).json(movilidad);
        } catch (error) {
            res.status(404).json({ message: error.message });
        }
    },

    // --- MANTENIMIENTOS Y DOCUMENTOS (NUEVOS CONTROLADORES) ---
    async addMantenimiento(req, res) {
        try {
            const { id } = req.params;
            const data = { ...req.body, movilidad_id: id };
            await movilidadService.registrarMantenimiento(data);
            res.status(201).json({ message: "Mantenimiento registrado con éxito" });
        } catch (error) {
            res.status(400).json({ message: "Error al registrar mantenimiento", error: error.message });
        }
    },

    async addDocumento(req, res) {
        try {
            const { id } = req.params;

            if (!req.file) {
                return res.status(400).json({
                    message: "Debe seleccionar un archivo."
                });
            }

            // Subir archivo a Cloudinary
            const resultado = await new Promise((resolve, reject) => {

                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "movilidades/documentos",
                        resource_type: "auto"
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );

                streamifier.createReadStream(req.file.buffer).pipe(stream);

            });

            const data = {
                ...req.body,
                movilidad_id: id,
                url_archivo: resultado.secure_url,
                public_id_cloudinary: resultado.public_id
            };

            await movilidadService.registrarDocumento(data);

            res.status(201).json({
                message: "Documento registrado con éxito",
                documento: data
            });

        } catch (error) {
            res.status(400).json({
                message: "Error al registrar documento",
                error: error.message
            });
        }
    },

    // --- MANTENIMIENTO DE REGISTROS ---
    async createMantenimiento(req, res) {
        try {
            if (!req.body.placa) return res.status(400).json({ message: "Placa obligatoria" });
            const nuevaMovilidad = await movilidadService.crearMovilidad(req.body);
            res.status(201).json({ message: "Movilidad registrada", id: nuevaMovilidad });
        } catch (error) {
            res.status(400).json({ message: "Error al registrar", error: error.message });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const actualizado = await movilidadService.actualizarMovilidad(id, req.body);
            if (!actualizado) return res.status(404).json({ message: "Movilidad no encontrada" });
            res.status(200).json({ message: "Información actualizada correctamente" });
        } catch (error) {
            res.status(400).json({ message: "Error al actualizar", error: error.message });
        }
    },

    async delete(req, res) {
        try {
            const eliminado = await movilidadService.eliminarMovilidad(req.params.id);
            if (!eliminado) return res.status(404).json({ message: "Movilidad no encontrada" });
            res.status(200).json({ message: "Movilidad eliminada correctamente" });
        } catch (error) {
            res.status(500).json({ message: "Error al eliminar", error: error.message });
        }
    }
};