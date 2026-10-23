import { otService } from './ot.service.js';
import { WhatsAppService } from '../../services/whatsapp.service.js';

const obtenerStatusError = (error) => {
    const mensaje = error.message?.toLowerCase() || '';

    if (
        mensaje.includes('no fue encontrada') ||
        mensaje.includes('no existe')
    ) {
        return 404;
    }

    if (
        mensaje.includes('informes técnicos pendientes') ||
        mensaje.includes('ya tiene una orden') ||
        mensaje.includes('no está disponible')
    ) {
        return 409;
    }

    if (
        mensaje.includes('no es válido') ||
        mensaje.includes('obligatorio') ||
        mensaje.includes('debe enviar') ||
        mensaje.includes('solo se puede')
    ) {
        return 400;
    }

    return 500;
};

export const otController = {
    /**
     * Obtiene las cotizaciones aprobadas
     * que todavía no tienen una OT activa.
     */
    async getAll(req, res) {
        try {
            const cotizaciones = await otService.getAll();

            return res.status(200).json({
                success: true,
                data: cotizaciones
            });
        } catch (error) {
            console.error(
                'Error al obtener cotizaciones disponibles para OT:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Ocurrió un error al obtener las cotizaciones disponibles',
                error: error.message
            });
        }
    },

    /**
     * Obtiene una cotización con sus equipos
     * y servicios para que Planner genere la OT.
     */
    async getCotizacionById(req, res) {
        try {
            const { idCotizacion } = req.params;

            const cotizacion =
                await otService.getCotizacionById(
                    idCotizacion
                );

            return res.status(200).json({
                success: true,
                data: cotizacion
            });
        } catch (error) {
            console.error(
                'Error al obtener la cotización para OT:',
                error
            );

            return res
                .status(obtenerStatusError(error))
                .json({
                    success: false,
                    message: error.message
                });
        }
    },

    /**
     * Genera una Orden de Trabajo
     * desde una cotización aprobada.
     */
    async create(req, res) {
        try {
            const {
                idCotizacion,
                idTecnicoResponsable,
                idMovilidad,
                fechaProgramada,
                fechaFinProgramada,
                idsTecnicosApoyo
            } = req.body;

            const idUsuarioCreador = req.user?.id_usuario;

            if (!idUsuarioCreador) {
                return res.status(401).json({
                    success: false,
                    message: 'No se pudo identificar al usuario autenticado'
                });
            }

            const orden = await otService.create({
                idCotizacion,
                idTecnicoResponsable,
                idMovilidad,
                fechaProgramada,
                fechaFinProgramada,
                idUsuarioCreador,
                idsTecnicosApoyo
            });

            const whatsapp = await WhatsAppService.notifyOtAssignment(orden.id_ot).catch(error => {
                console.error('No se pudieron enviar las notificaciones de WhatsApp:', error.message);
                return { habilitado: true, enviados: 0, omitidos: orden.tecnicos_asignados?.length || 0, errores: [{ motivo: error.message }] };
            });

            return res.status(201).json({
                success: true,
                message: 'Orden de Trabajo creada correctamente',
                data: { ...orden, whatsapp }
            });
        } catch (error) {
            console.error(
                'Error al crear la Orden de Trabajo:',
                error
            );

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * Lista todas las órdenes de trabajo creadas.
     */
    async getOrdenes(req, res) {
        try {
            const ordenes =
                await otService.getOrdenes();

            return res.status(200).json({
                success: true,
                data: ordenes
            });
        } catch (error) {
            console.error(
                'Error al obtener las órdenes de trabajo:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Ocurrió un error al obtener las órdenes de trabajo',
                error: error.message
            });
        }
    },

    /**
     * Obtiene una OT completa con sus equipos,
     * servicios y tiempos.
     */
    async getOrdenById(req, res) {
        try {
            const { idOt } = req.params;

            const orden =
                await otService.getOrdenById(idOt);

            return res.status(200).json({
                success: true,
                data: orden
            });
        } catch (error) {
            console.error(
                'Error al obtener la Orden de Trabajo:',
                error
            );

            return res
                .status(obtenerStatusError(error))
                .json({
                    success: false,
                    message: error.message
                });
        }
    },

    async updateProgramacion(req, res) {
        try {
            const orden = await otService.updateProgramacion(req.params.idOt, req.body);
            return res.status(200).json({
                success: true,
                message: 'Programación de la Orden de Trabajo actualizada correctamente',
                data: orden
            });
        } catch (error) {
            return res.status(obtenerStatusError(error)).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * Actualiza el estado global de una OT.
     */
    async updateEstado(req, res) {
        try {
            const { idOt } = req.params;
            const { estado } = req.body;

            const resultado =
                await otService.updateEstado(
                    idOt,
                    estado
                );

            return res.status(200).json({
                success: true,
                message:
                    'Estado de la Orden de Trabajo actualizado correctamente',
                data: resultado
            });
        } catch (error) {
            console.error(
                'Error al actualizar el estado de la OT:',
                error
            );

            return res
                .status(obtenerStatusError(error))
                .json({
                    success: false,
                    message: error.message
                });
        }
    },

    /**
     * Actualiza el estado de un equipo
     * dentro de la Orden de Trabajo.
     */
    async updateEstadoEquipo(req, res) {
        try {
            const { idOtDetalle } = req.params;
            const { estadoEquipo } = req.body;

            const resultado =
                await otService.updateEstadoEquipo(
                    idOtDetalle,
                    estadoEquipo
                );

            return res.status(200).json({
                success: true,
                message:
                    'Estado del equipo actualizado correctamente',
                data: resultado
            });
        } catch (error) {
            console.error(
                'Error al actualizar el estado del equipo:',
                error
            );

            return res
                .status(obtenerStatusError(error))
                .json({
                    success: false,
                    message: error.message
                });
        }
    },

    /**
     * Actualiza los tiempos de un equipo.
     */
    async updateTiempos(req, res) {
        try {
            const { idOtDetalle } = req.params;

            const resultado =
                await otService.updateTiempos(
                    idOtDetalle,
                    req.body
                );

            return res.status(200).json({
                success: true,
                message:
                    'Tiempos del equipo actualizados correctamente',
                data: resultado
            });
        } catch (error) {
            console.error(
                'Error al actualizar los tiempos del equipo:',
                error
            );

            return res
                .status(obtenerStatusError(error))
                .json({
                    success: false,
                    message: error.message
                });
        }
    },

    /**
     * Elimina una OT que todavía no ha iniciado.
     */
    async delete(req, res) {
        try {
            const { idOt } = req.params;

            const resultado =
                await otService.delete(idOt);

            return res.status(200).json({
                success: true,
                message:
                    'Orden de Trabajo eliminada correctamente',
                data: resultado
            });
        } catch (error) {
            console.error(
                'Error al eliminar la Orden de Trabajo:',
                error
            );

            return res
                .status(obtenerStatusError(error))
                .json({
                    success: false,
                    message: error.message
                });
        }
    }
};
