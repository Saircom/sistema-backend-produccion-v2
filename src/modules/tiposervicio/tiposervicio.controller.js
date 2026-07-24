// src/modules/equipos/equipo.controller.js
import { tiposervicioService } from './tiposervicio.service.js';

export const tiposervicioController = {

    /**
     * Obtiene el listado de tipos de servicio para el primer selector
     */
    async getAll(req, res) {
        try {
            // Corregido: Llamamos al método getTiposServicio (CamelCase)
            const tipos = await tiposervicioService.getTiposServicio();
            res.status(200).json(tipos);
        } catch (error) {
            res.status(500).json({ error: "Error al obtener los tipos: " + error.message });
        }
    },

    /**
     * Obtiene subtipos filtrados por el ID de un tipo de servicio
     */
    async getByTipo(req, res) {
        try {
            // Obtenemos el ID desde los parámetros de la ruta
            const { id } = req.params;

            // Validación de presencia
            if (!id) {
                return res.status(400).json({ error: "El ID del tipo de servicio es requerido" });
            }

            const subtipos = await tiposervicioService.getSubtiposPorTipo(id);

            // Si no encuentra nada, es bueno retornar un 404 o un array vacío
            res.status(200).json(subtipos);
        } catch (error) {
            // Manejo de errores específicos
            res.status(500).json({ error: error.message });
        }
    }
};