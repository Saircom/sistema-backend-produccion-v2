// src/modules/tecnicoOT/tecnicoOT.controller.js
import { tecnicoOTService } from './tecnicoOT.service.js';

const obtenerStatus = (error) => {
    const mensaje = error.message?.toLowerCase() || '';

    if (
        mensaje.includes('no existe') ||
        mensaje.includes('no está asignada') ||
        mensaje.includes('no pertenece')
    ) {
        return 404;
    }

    if (
        mensaje.includes('no es válido') ||
        mensaje.includes('estado no válido')
    ) {
        return 400;
    }

    return 500;
};

export const tecnicoOTController = {
    /**
     * Temporal sin token:
     * GET /tecnico-ot/:idTecnico
     */
    async getOrdenes(req, res) {
        try {
            const { idTecnico } = req.params;

            const ordenes =
                await tecnicoOTService.getOrdenesByTecnico(
                    idTecnico
                );

            return res.status(200).json({
                success: true,
                data: ordenes
            });
        } catch (error) {
            console.error(
                'Error al obtener órdenes del técnico:',
                error
            );

            return res
                .status(obtenerStatus(error))
                .json({
                    success: false,
                    message: error.message
                });
        }
    },

    /**
     * Temporal sin token:
     * GET /tecnico-ot/:idTecnico/ordenes/:idOt
     */
    async getOrdenById(req, res) {
        try {
            const {
                idTecnico,
                idOt
            } = req.params;

            const orden =
                await tecnicoOTService.getOrdenById(
                    idOt,
                    idTecnico
                );

            return res.status(200).json({
                success: true,
                data: orden
            });
        } catch (error) {
            console.error(
                'Error al obtener detalle de OT:',
                error
            );

            return res
                .status(obtenerStatus(error))
                .json({
                    success: false,
                    message: error.message
                });
        }
    },

    /**
     * Valida que un detalle pertenezca al técnico.
     */
    async verificarDetalle(req, res) {
        try {
            const {
                idTecnico,
                idOtDetalle
            } = req.params;

            const detalle =
                await tecnicoOTService.verificarDetalle(
                    idOtDetalle,
                    idTecnico
                );

            return res.status(200).json({
                success: true,
                data: detalle
            });
        } catch (error) {
            return res
                .status(obtenerStatus(error))
                .json({
                    success: false,
                    message: error.message
                });
        }
    },

    /**
     * Actualiza un servicio del equipo.
     */
    async updateEstadoServicio(req, res) {
        try {
            const {
                idTecnico,
                idOtDetalleServicio
            } = req.params;

            const resultado =
                await tecnicoOTService.updateEstadoServicio(
                    idOtDetalleServicio,
                    idTecnico,
                    req.body
                );

            return res.status(200).json({
                success: true,
                message:
                    'Servicio actualizado correctamente',
                data: resultado
            });
        } catch (error) {
            console.error(
                'Error al actualizar servicio:',
                error
            );

            return res
                .status(obtenerStatus(error))
                .json({
                    success: false,
                    message: error.message
                });
        }
    }
};