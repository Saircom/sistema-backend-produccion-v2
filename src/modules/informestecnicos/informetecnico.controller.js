// src/modules/informes/informetecnico.controller.js

import { informetecnicoService } from './informetecnico.service.js';

export const informetecnicoControlller = {

    /**
     * GET /api/informes
     */
    getAll: async (req, res) => {
        try {

            const informes = await informetecnicoService.getAll(req.user?.rol);

            return res.status(200).json({
                success: true,
                data: informes
            });

        } catch (error) {
            console.error('Error al listar informes:', error);

            return res.status(500).json({
                success: false,
                message: 'Error al obtener los informes técnicos.',
                error: error.message
            });
        }
    },

    updateEstadoRevision: async (req, res) => {
        try {
            const data = await informetecnicoService.updateEstadoRevision(
                req.params.idInforme,
                req.body?.estado_revision,
                req.user?.rol
            );
            return res.status(200).json({
                success: true,
                message: 'Estado de revisión actualizado correctamente',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'No se pudo actualizar el estado de revisión'
            });
        }
    },

    updateEstadoEnvio: async (req, res) => {
        try {
            const data = await informetecnicoService.updateEstadoEnvio(
                req.params.idInforme,
                req.body?.estado_envio,
                req.user?.rol
            );
            return res.status(200).json({
                success: true,
                message: 'Estado de envío actualizado correctamente',
                data
            });
        } catch (error) {
            const status = error.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'No se pudo actualizar el estado de envío'
            });
        }
    },

    getReporteServiciosExport: async (req, res) => {
        try {
            const { fechaDesde, fechaHasta } = req.query || {};
            const data = await informetecnicoService.getReporteServiciosExport({ fechaDesde, fechaHasta });
            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error al exportar reporte de servicios:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener el reporte de servicios.',
                error: error.message
            });
        }
    }

};

export default informetecnicoControlller;
