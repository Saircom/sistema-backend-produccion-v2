import { Gasto } from './gasto.model.js';

export const gastoService = {

    async obtenerDetalle(idGasto, usuario) {
        return await Gasto.obtenerPorId(idGasto, usuario);
    },

    async listarTodos(usuario) {
        return await Gasto.obtenerTodos(usuario);
    },

    async obtenerPorUsuario(idUsuario) {
        return await Gasto.obtenerTodos({ id_usuario: idUsuario, rol: 'USER' });
    },

    async listarSegunRol(idUsuario, esAdmin) {
        return await Gasto.obtenerTodos({ id_usuario: idUsuario, rol: esAdmin ? 'ADMINISTRADOR' : 'USER' });
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