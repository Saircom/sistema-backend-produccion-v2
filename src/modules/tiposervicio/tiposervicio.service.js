// src/modules/equipos/equipos.service.js
import { tiposervicioModel } from './tiposervicio.model.js';

export const tiposervicioService = {

    /**
     * Obtiene todos los tipos de servicios para el primer selector
     */
    async getTiposServicio() {
        // Llamamos al método nuevo que creamos en el modelo
        return await tiposervicioModel.getAllTipos();
    },

    /**
     * Obtiene solo los subtipos asociados a un tipo de servicio específico
     * @param {number|string} id_tipo_servicio 
     */
    async getSubtiposPorTipo(id_tipo_servicio) {
        // Validación mejorada: también verificamos si es un valor vacío
        if (!id_tipo_servicio || id_tipo_servicio === "null" || id_tipo_servicio === "undefined") {
            throw new Error("El ID del tipo de servicio es obligatorio y debe ser válido.");
        }

        return await tiposervicioModel.getByTipoId(id_tipo_servicio);
    }
};