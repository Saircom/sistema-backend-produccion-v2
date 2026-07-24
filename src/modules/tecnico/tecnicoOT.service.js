// src/modules/tecnicoOT/tecnicoOT.service.js
import { tecnicoOTModel } from './tecnicoOT.model.js';

const ESTADOS_SERVICIO = [
    'Pendiente',
    'Realizado',
    'No realizado',
    'Observado'
];

const validarId = (valor, campo) => {
    const id = Number(valor);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`${campo} no es válido`);
    }

    return id;
};

export const tecnicoOTService = {
    async getOrdenesByTecnico(idTecnico) {
        const id = validarId(
            idTecnico,
            'El ID del técnico'
        );

        const ordenes =
            await tecnicoOTModel.getOrdenesByTecnico(id);

        return Array.isArray(ordenes)
            ? ordenes
            : [];
    },

    async getOrdenById(idOt, idTecnico) {
        const ot = validarId(
            idOt,
            'El ID de la Orden de Trabajo'
        );

        const tecnico = validarId(
            idTecnico,
            'El ID del técnico'
        );

        const orden =
            await tecnicoOTModel.getOrdenById(
                ot,
                tecnico
            );

        if (!orden) {
            throw new Error(
                'La Orden de Trabajo no existe o no está asignada al técnico'
            );
        }

        return orden;
    },

    async verificarDetalle(
        idOtDetalle,
        idTecnico
    ) {
        const detalle = validarId(
            idOtDetalle,
            'El ID del detalle'
        );

        const tecnico = validarId(
            idTecnico,
            'El ID del técnico'
        );

        const resultado =
            await tecnicoOTModel.verificarDetalleTecnico(
                detalle,
                tecnico
            );

        if (!resultado) {
            throw new Error(
                'El equipo no pertenece a una orden asignada al técnico'
            );
        }

        return resultado;
    },

    async updateEstadoServicio(
        idOtDetalleServicio,
        idTecnico,
        data
    ) {
        const idServicio = validarId(
            idOtDetalleServicio,
            'El ID del servicio'
        );

        const tecnico = validarId(
            idTecnico,
            'El ID del técnico'
        );

        const { estado, observacion = null } = data;

        if (!ESTADOS_SERVICIO.includes(estado)) {
            throw new Error(
                `Estado no válido. Permitidos: ${ESTADOS_SERVICIO.join(', ')}`
            );
        }

        const actualizado =
            await tecnicoOTModel.updateEstadoServicio(
                idServicio,
                tecnico,
                estado,
                observacion
            );

        if (!actualizado) {
            throw new Error(
                'No se pudo actualizar el servicio'
            );
        }

        return {
            id_ot_detalle_servicio: idServicio,
            estado,
            observacion
        };
    }
};