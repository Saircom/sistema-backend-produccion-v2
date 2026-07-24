import { movilidadModel } from './movilidad.model.js';

export const movilidadService = {

    async createMovilidad(data) {
        // Validaciones básicas antes de enviar al modelo
        if (!data.placa || !data.marca || !data.modelo) {
            throw new Error("Datos incompletos: la placa, marca y modelo son obligatorios.");
        }

        // Opcional: Validar que el kilometraje sea un número positivo
        if (data.kilometraje_actual < 0) {
            throw new Error("El kilometraje no puede ser negativo.");
        }

        // En el servicio, cambia:
        return await movilidadModel.createMovilidad(data); // Antes era .create
    },
    // --- Gestión de Movilidades ---
    async getAllMovilidades() {
        return await movilidadModel.getAll();
    },

    async getDetalleMovilidad(id) {
        // Obtenemos todo el conjunto de datos necesario para el frontend
        const movilidad = await movilidadModel.getById(id);
        if (!movilidad) throw new Error("Movilidad no encontrada");

        // Obtenemos los historiales relacionados desde las nuevas tablas
        const mantenimientos = await movilidadModel.getHistorialMantenimiento(id);
        const documentos = await movilidadModel.getDocumentos(id);

        return {
            ...movilidad,
            historial_mantenimientos: mantenimientos,
            documentos: documentos
        };
    },

    // --- Gestión de Mantenimientos (Historial Técnico) ---
    async registrarMantenimiento(data) {
        // Validamos que el kilometraje sea lógico
        if (data.kilometraje_al_momento < 0) throw new Error("El kilometraje no puede ser negativo");
        return await movilidadModel.registrarMantenimiento(data);
    },

    async registrarDocumento(data, fileBuffer) {

        if (new Date(data.fecha_vencimiento) < new Date()) {
            console.warn("Se está registrando un documento vencido");
        }

        return await movilidadModel.registrarDocumento(data, fileBuffer);
    },

    // --- Métodos de utilidad ---
    async asignarEstado(id_movilidad, nuevoEstado) {
        const estadosValidos = ['Disponible', 'Ocupado', 'En Mantenimiento'];
        if (!estadosValidos.includes(nuevoEstado)) {
            throw new Error("Estado de movilidad no válido");
        }
        return await movilidadModel.updateEstado(id_movilidad, nuevoEstado);
    },

    async eliminarMovilidad(id) {
        return await movilidadModel.delete(id);
    }
};