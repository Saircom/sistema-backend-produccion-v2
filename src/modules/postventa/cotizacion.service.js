import { cotizacionModel } from './cotizacion.model.js';

export const cotzacionService = {
    async findAll() { return await cotizacionModel.getAll(); },
    
    async getEstadoById(id_servicio) { return await cotizacionModel.getEstadoActual(id_servicio); },

    async updateEstado(id_servicio, nuevoEstado) {
        const estadoActual = await cotizacionModel.getEstadoActual(id_servicio);
        const nuevoEstadoNum = Number(nuevoEstado);

        if (nuevoEstadoNum < estadoActual) {
            throw new Error("No está permitido retroceder el estado de la cotización");
        }

        return await cotizacionModel.updateEstado(id_servicio, nuevoEstadoNum);
    }
};