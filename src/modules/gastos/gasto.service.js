import { Gasto } from './gasto.model.js';

export const gastoService = {

    async obtenerDetalle(idGasto) {
        return await Gasto.obtenerPorId(idGasto);
    },

    async listarSegunRol(idUsuario, esAdmin) {
        if (esAdmin) {
            return await Gasto.obtenerTodos();
        } else {
            return await Gasto.obtenerPorUsuario(idUsuario);
        }
    },

    async obtenerPorServicio(idServicio) {
        return await Gasto.obtenerPorServicio(idServicio);
    },

    async obtenerOperativos() {
        return await Gasto.obtenerOperativos();
    },

    async crearGasto(data) {
        // Delegamos la creación al modelo
        const idGasto = await Gasto.crearCabecera(data);

        if (data.detalles && data.detalles.length > 0) {
            for (const detalle of data.detalles) {
                detalle.id_gasto_c = idGasto;
                await Gasto.agregarDetalle(detalle);
            }
        }
        return { id_gasto_c: idGasto, mensaje: 'Gasto creado con éxito' };
    },

    async actualizarCabecera(idGasto, cabeceraData) {
        return await Gasto.actualizarCabecera(idGasto, cabeceraData);
    },

    async actualizarDetalle(idDetalle, detalleData) {
        return await Gasto.actualizarDetalle(idDetalle, detalleData);
    },

    async eliminarDetalle(idDetalle) {
        return await Gasto.eliminarDetalle(idDetalle);
    },

    async eliminarGasto(idGasto) {
        // Asumiendo que tu DB tiene ON DELETE CASCADE configurado 
        // para limpiar los detalles automáticamente.
        return await Gasto.eliminarCabecera(idGasto);
    }
};