import { cotzacionService } from './cotizacion.service.js';

export const cotizacionController = {
    async getAll(req, res) {
        try {
            const data = await cotzacionService.findAll();
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    async updateEstado(req, res) {
        try {
            const { id_servicio } = req.params;
            const { estado_cotizacion } = req.body;

            const mapa = { 'Pendiente': 1, 'Enviado': 2, 'Aprobado': 3 };
            const nuevoValor = mapa[estado_cotizacion];

            if (!nuevoValor) return res.status(400).json({ message: "Estado inválido" });

            const result = await cotzacionService.updateEstado(id_servicio, nuevoValor);

            res.status(200).json({ message: "Actualizado correctamente" });
        } catch (error) {
            if (error.message === "No está permitido retroceder el estado de la cotización") {
                return res.status(403).json({ message: error.message });
            }
            res.status(500).json({ message: error.message });
        }
    }
};