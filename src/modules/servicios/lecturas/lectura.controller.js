import { lecturasService } from './lectura.service.js';

export const lecturasController = {
    create: async (req, res) => {
        try {
            const { id } = req.params; // ID del servicio
            const body = req.body;

            // Validación: Permitimos que el frontend envíe un objeto o un array
            // Esto hace que tu API sea mucho más flexible
            const lecturas = Array.isArray(body) ? body : [body];

            // Validar que cada elemento tenga lo mínimo necesario
            for (const item of lecturas) {
                if (!item.tipo || !item.datos) {
                    return res.status(400).json({
                        error: "Formato inválido. Cada lectura debe incluir 'tipo' y 'datos'."
                    });
                }
            }

            // Llamamos al servicio con el array preparado
            await lecturasService.createMany(id, lecturas);

            res.status(201).json({
                message: "Lecturas procesadas y guardadas correctamente"
            });
        } catch (error) {
            console.error("Error en el controlador de lecturas:", error);
            res.status(500).json({ error: error.message });
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params; // ID del servicio
            const body = req.body;

            // 1. Validación básica de existencia
            if (!id) {
                return res.status(400).json({ error: "El ID del servicio es requerido." });
            }

            // 2. Normalización a array
            const lecturas = Array.isArray(body) ? body : [body];

            // 3. Validación de estructura
            for (const item of lecturas) {
                if (!item.tipo || !item.datos) {
                    return res.status(400).json({
                        error: `Formato inválido en la lectura de tipo: ${item.tipo || 'desconocido'}.`
                    });
                }
            }

            // 4. Llamada al servicio (que ya maneja el upsert/transacción)
            await lecturasService.updateMany(id, lecturas);

            res.status(200).json({
                message: "Lecturas actualizadas correctamente."
            });
        } catch (error) {
            console.error("Error en el controlador de actualización:", error);
            res.status(500).json({ error: "Ocurrió un error al procesar las lecturas: " + error.message });
        }
    }
};