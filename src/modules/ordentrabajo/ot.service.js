import { otModel } from './ot.model.js';

const ESTADOS_OT = [
    'Programada',
    'En Proceso',
    'Finalizada'
];

const ESTADOS_EQUIPO = [
    'Pendiente',
    'En proceso',
    'Finalizado'
];

const validarId = (value, campo = 'ID') => {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`${campo} no es válido`);
    }

    return id;
};

const validarIdOpcional = (value, campo = 'ID') => {
    if (value === null || value === undefined || value === '') return null;
    return validarId(value, campo);
};

const validarFecha = (fecha) => {
    if (!fecha) {
        throw new Error(
            'La fecha y hora programada son obligatorias'
        );
    }

    const fechaConvertida = new Date(fecha);

    if (Number.isNaN(fechaConvertida.getTime())) {
        throw new Error(
            'La fecha y hora programada no son válidas'
        );
    }

    return fecha;
};

const validarRangoProgramado = (fechaInicio, fechaFin) => {
    const inicio = validarFecha(fechaInicio);
    const fin = validarFecha(fechaFin);

    if (new Date(fin).getTime() <= new Date(inicio).getTime()) {
        throw new Error('La fecha y hora de fin deben ser posteriores al inicio');
    }

    return { inicio, fin };
};

export const otService = {
    /**
     * Obtiene cotizaciones aprobadas sin una OT activa.
     */
    async getAll() {
        const cotizaciones = await otModel.getAll();

        return Array.isArray(cotizaciones)
            ? cotizaciones
            : [];
    },

    /**
     * Obtiene una cotización con sus equipos y servicios
     * para que el Planner pueda programar la OT.
     */
    async getCotizacionById(idCotizacion) {
        const id = validarId(
            idCotizacion,
            'El ID de la cotización'
        );

        const cotizacion =
            await otModel.getCotizacionById(id);

        if (!cotizacion) {
            throw new Error(
                'La cotización no fue encontrada'
            );
        }

        return cotizacion;
    },

    /**
     * Genera una OT desde una cotización aprobada.
     */
    async create(data) {
        const {
            idCotizacion,
            idTecnicoResponsable,
            idMovilidad,
            fechaProgramada,
            fechaFinProgramada,
            idUsuarioCreador,
            idsTecnicosApoyo = []
        } = data;

        const rangoProgramado = validarRangoProgramado(
            fechaProgramada,
            fechaFinProgramada
        );

        const datosNormalizados = {
            idCotizacion: validarId(
                idCotizacion,
                'El ID de la cotización'
            ),

            idTecnicoResponsable: validarId(
                idTecnicoResponsable,
                'El técnico responsable'
            ),

            idMovilidad: validarIdOpcional(
                idMovilidad,
                'La movilidad'
            ),

            fechaProgramada: rangoProgramado.inicio,
            fechaFinProgramada: rangoProgramado.fin,

            idUsuarioCreador: validarId(
                idUsuarioCreador,
                'El usuario creador'
            ),

            idsTecnicosApoyo: [...new Set(
                (Array.isArray(idsTecnicosApoyo) ? idsTecnicosApoyo : [])
                    .map(id => validarId(id, 'El técnico de apoyo'))
                    .filter(id => id !== Number(idTecnicoResponsable))
            )]
        };

        return await otModel.createFromCotizacion(
            datosNormalizados
        );
    },

    /**
     * Obtiene todas las órdenes de trabajo creadas.
     */
    async getOrdenes() {
        const ordenes = await otModel.getOrdenes();

        return Array.isArray(ordenes)
            ? ordenes
            : [];
    },

    /**
     * Obtiene una OT completa con equipos,
     * servicios y tiempos.
     */
    async getOrdenById(idOt) {
        const id = validarId(
            idOt,
            'El ID de la Orden de Trabajo'
        );

        const orden = await otModel.getOrdenById(id);

        if (!orden) {
            throw new Error(
                'La Orden de Trabajo no fue encontrada'
            );
        }

        return orden;
    },

    async updateProgramacion(idOt, data) {
        const id = validarId(idOt, 'El ID de la Orden de Trabajo');
        const rango = validarRangoProgramado(data.fechaProgramada, data.fechaFinProgramada);
        const idTecnicoResponsable = validarId(data.idTecnicoResponsable, 'El técnico responsable');
        const idsTecnicosApoyo = [...new Set(
            (Array.isArray(data.idsTecnicosApoyo) ? data.idsTecnicosApoyo : [])
                .map(valor => validarId(valor, 'El técnico de apoyo'))
                .filter(valor => valor !== idTecnicoResponsable)
        )];
        await otModel.updateProgramacion(id, {
            idTecnicoResponsable,
            idsTecnicosApoyo,
            idMovilidad: validarIdOpcional(data.idMovilidad, 'La movilidad'),
            fechaProgramada: rango.inicio,
            fechaFinProgramada: rango.fin
        });
        return await this.getOrdenById(id);
    },

    /**
     * Actualiza el estado global de una OT.
     */
    async updateEstado(idOt, estado) {
        const id = validarId(
            idOt,
            'El ID de la Orden de Trabajo'
        );

        if (!ESTADOS_OT.includes(estado)) {
            throw new Error(
                `Estado de OT no válido. Valores permitidos: ${ESTADOS_OT.join(', ')}`
            );
        }

        const actualizado =
            await otModel.updateEstado(id, estado);

        if (!actualizado) {
            throw new Error(
                'No se pudo actualizar la Orden de Trabajo'
            );
        }

        return {
            id_ot: id,
            estado
        };
    },

    /**
     * Actualiza el estado de un equipo dentro de la OT.
     */
    async updateEstadoEquipo(
        idOtDetalle,
        estadoEquipo
    ) {
        const id = validarId(
            idOtDetalle,
            'El ID del detalle de la OT'
        );

        if (!ESTADOS_EQUIPO.includes(estadoEquipo)) {
            throw new Error(
                `Estado del equipo no válido. Valores permitidos: ${ESTADOS_EQUIPO.join(', ')}`
            );
        }

        const actualizado =
            await otModel.updateEstadoEquipo(
                id,
                estadoEquipo
            );

        if (!actualizado) {
            throw new Error(
                'No se pudo actualizar el estado del equipo'
            );
        }

        return {
            id_ot_detalle: id,
            estado_equipo: estadoEquipo
        };
    },

    /**
     * Actualiza llegada, inicio o fin de un equipo.
     */
    async updateTiempos(idOtDetalle, data) {
        const id = validarId(
            idOtDetalle,
            'El ID del detalle de la OT'
        );

        const {
            fechaHoraLlegada = null,
            fechaHoraInicio = null,
            fechaHoraFin = null
        } = data;

        if (
            !fechaHoraLlegada &&
            !fechaHoraInicio &&
            !fechaHoraFin
        ) {
            throw new Error(
                'Debe enviar al menos un tiempo para actualizar'
            );
        }

        const actualizado =
            await otModel.updateTiempos(id, {
                fechaHoraLlegada,
                fechaHoraInicio,
                fechaHoraFin
            });

        if (!actualizado) {
            throw new Error(
                'No se pudo actualizar los tiempos del equipo'
            );
        }

        return {
            id_ot_detalle: id,
            fecha_hora_llegada:
                fechaHoraLlegada,
            fecha_hora_inicio:
                fechaHoraInicio,
            fecha_hora_fin:
                fechaHoraFin
        };
    },

    /**
     * Elimina una OT que todavía no ha iniciado.
     */
    async delete(idOt) {
        const id = validarId(
            idOt,
            'El ID de la Orden de Trabajo'
        );

        const eliminado = await otModel.delete(id);

        if (!eliminado) {
            throw new Error(
                'No se pudo eliminar la Orden de Trabajo'
            );
        }

        return {
            id_ot: id
        };
    }
};
