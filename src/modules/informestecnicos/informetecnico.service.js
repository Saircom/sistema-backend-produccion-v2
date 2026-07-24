// src/modules/informes/informetecnico.service.js

import informetecnicoModel from './informetecnico.model.js';
import { hasAnyRole } from '../../utils/roles.js';

export const informetecnicoService = {

    /**
     * Obtener todos los informes técnicos
     */
    getAll: async (rol) => {
        try {
            return await informetecnicoModel.getAll(rol);
        } catch (error) {
            console.error(
                'Error al obtener los informes técnicos:',
                error
            );
            throw error;
        }
    },

    updateEstadoRevision: async (idInforme, estadoRevision, rol) => {
        const id = Number(idInforme);
        const estados = ['No revisado', 'Revisado', 'Eliminado', 'Observado'];

        if (!hasAnyRole(rol, 'ADMINISTRADOR', 'PLANNER')) {
            const error = new Error('Solo Administrador y Planner pueden cambiar el estado de revisión');
            error.statusCode = 403;
            throw error;
        }
        if (!Number.isInteger(id) || id <= 0) {
            const error = new Error('El ID del informe no es válido');
            error.statusCode = 400;
            throw error;
        }
        if (!estados.includes(estadoRevision)) {
            const error = new Error(`Estado no válido. Valores permitidos: ${estados.join(', ')}`);
            error.statusCode = 400;
            throw error;
        }

        const actualizado = await informetecnicoModel.updateEstadoRevision(id, estadoRevision);
        if (!actualizado) {
            const error = new Error('El informe no existe o todavía no ha sido finalizado');
            error.statusCode = 404;
            throw error;
        }
        return { id_informe: id, estado_revision: estadoRevision };
    }

};

export default informetecnicoService;
