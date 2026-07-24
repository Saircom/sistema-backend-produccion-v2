import { FirmaService } from "./firma.service.js";

export const save = async (req, res) => {
    try {
        const { id_servicio, firma, encargado } = req.body;

        await FirmaService.save({
            id_servicio,
            firma,
            encargado
        });

        return res.json({
            success: true,
            message: "Firma guardada correctamente"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const update = async (req, res) => {
    try {
        const { id_servicio } = req.params; // Se asume que viene de la ruta /:id_servicio
        const { firma, encargado } = req.body;

        const actualizado = await FirmaService.update(id_servicio, {
            firma,
            encargado
        });

        if (!actualizado) {
            return res.status(404).json({
                success: false,
                message: "No se encontró el servicio para actualizar la firma"
            });
        }

        return res.json({
            success: true,
            message: "Firma actualizada correctamente"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getByServicio = async (req, res) => {
    try {
        const { id_servicio } = req.params;

        const data = await FirmaService.findByServicio(
            id_servicio
        );

        return res.json({
            success: true,
            data
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};