import TiempoModel from './tiempo.model.js';

class TiempoService {
    static async listar() {
        return await TiempoModel.listar();
    }

    /**
     * Obtiene los tiempos de un equipo dentro de una OT.
     */
    static async obtener(idOtDetalle) {
        const id = Number(idOtDetalle);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('El ID del detalle de la OT no es válido');
        }

        const tiempo = await TiempoModel.obtenerPorDetalle(id);

        if (!tiempo) {
            throw new Error(
                'No se encontró el registro de tiempos para este equipo'
            );
        }

        return tiempo;
    }

    /**
     * Registra la llegada del técnico.
     */
    static async registrarLlegada(idOtDetalle) {
        const id = Number(idOtDetalle);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('El ID del detalle de la OT no es válido');
        }

        const tiempo = await TiempoModel.obtenerPorDetalle(id);

        if (!tiempo) {
            throw new Error(
                'No existe un registro de tiempos para este equipo'
            );
        }

        if (tiempo.fecha_hora_llegada) {
            throw new Error('La hora de llegada ya fue registrada');
        }

        if (tiempo.fecha_hora_inicio || tiempo.fecha_hora_fin) {
            throw new Error(
                'El trabajo ya avanzó y no se puede registrar la llegada'
            );
        }

        const resultado =
            await TiempoModel.registrarLlegada(id);

        if (!resultado) {
            throw new Error(
                'No se pudo registrar la hora de llegada'
            );
        }

        return await TiempoModel.obtenerPorDetalle(id);
    }

    /**
     * Registra el inicio del trabajo del equipo.
     */
    static async registrarInicio(idOtDetalle) {
        const id = Number(idOtDetalle);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('El ID del detalle de la OT no es válido');
        }

        const tiempo = await TiempoModel.obtenerPorDetalle(id);

        if (!tiempo) {
            throw new Error(
                'No existe un registro de tiempos para este equipo'
            );
        }

        if (!tiempo.fecha_hora_llegada) {
            throw new Error(
                'Debe registrar la llegada antes de iniciar el trabajo'
            );
        }

        if (tiempo.fecha_hora_inicio) {
            throw new Error(
                'La hora de inicio ya fue registrada'
            );
        }

        if (tiempo.fecha_hora_fin) {
            throw new Error(
                'El trabajo ya fue finalizado'
            );
        }

        const resultado =
            await TiempoModel.registrarInicio(id);

        if (!resultado || resultado.affectedRows === 0) {
            throw new Error(
                'No se pudo registrar la hora de inicio'
            );
        }

        return await TiempoModel.obtenerPorDetalle(id);
    }

    /**
     * Registra el fin del trabajo del equipo.
     */
    static async registrarFin(idOtDetalle) {
        const id = Number(idOtDetalle);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('El ID del detalle de la OT no es válido');
        }

        const tiempo = await TiempoModel.obtenerPorDetalle(id);

        if (!tiempo) {
            throw new Error(
                'No existe un registro de tiempos para este equipo'
            );
        }

        if (!tiempo.fecha_hora_inicio) {
            throw new Error(
                'Debe registrar el inicio antes de finalizar el trabajo'
            );
        }

        if (tiempo.fecha_hora_fin) {
            throw new Error(
                'La hora de finalización ya fue registrada'
            );
        }

        const resultado =
            await TiempoModel.registrarFin(id);

        if (!resultado) {
            throw new Error(
                'No se pudo registrar la hora de finalización'
            );
        }

        return await TiempoModel.obtenerPorDetalle(id);
    }
}

export default TiempoService;
