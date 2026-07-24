// src/modules/informes/informes.controller.js
import { informesService } from './informe.service.js';

const obtenerStatusCode = (error) => {
    if (
        Number.isInteger(error?.statusCode) &&
        error.statusCode >= 400 &&
        error.statusCode <= 599
    ) {
        return error.statusCode;
    }

    const mensaje =
        error?.message?.toLowerCase() ?? '';

    if (
        mensaje.includes('no encontrado') ||
        mensaje.includes('no fue encontrado') ||
        mensaje.includes('no existe') ||
        mensaje.includes('no pertenece')
    ) {
        return 404;
    }

    if (
        mensaje.includes('ya se encuentra finalizado') ||
        mensaje.includes('ya está finalizado')
    ) {
        return 409;
    }

    if (
        mensaje.includes('no es válido') ||
        mensaje.includes('no son válidos') ||
        mensaje.includes('obligatorio') ||
        mensaje.includes('debe guardar') ||
        mensaje.includes('datos del informe')
    ) {
        return 400;
    }

    return 500;
};

/**
 * Respuesta centralizada de error.
 */
const responderError = (
    res,
    error,
    mensajeLog
) => {
    console.error(mensajeLog, error);

    return res
        .status(obtenerStatusCode(error))
        .json({
            success: false,
            message:
                error?.message ||
                'Ocurrió un error inesperado'
        });
};

export const informesController = {
    /**
     * =====================================================
     * CONSULTAS DEL TÉCNICO
     * =====================================================
     */

    /**
     * Carga el informe completo validando que
     * el detalle pertenezca al técnico.
     *
     * GET
     * /api/informe/tecnico/:idTecnico/detalles/:idOtDetalle
     */
    async getByOtDetalleTecnico(req, res) {
        try {
            const {
                idTecnico,
                idOtDetalle
            } = req.params;

            const data =
                await informesService
                    .getByOtDetalleTecnico(
                        idTecnico,
                        idOtDetalle
                    );

            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            return responderError(
                res,
                error,
                'Error al cargar el informe del técnico:'
            );
        }
    },

    /**
     * Guarda o actualiza el informe validando
     * que pertenezca al técnico.
     *
     * PUT
     * /api/informe/tecnico/:idTecnico/detalles/:idOtDetalle
     */
    async guardarInformeTecnico(req, res) {
        try {
            const {
                idTecnico,
                idOtDetalle
            } = req.params;

            const payload = req.body;

            const data =
                await informesService
                    .guardarInformeTecnico(
                        idTecnico,
                        idOtDetalle,
                        payload
                    );

            return res.status(200).json({
                success: true,
                message:
                    data?.message ||
                    'Informe técnico guardado correctamente',
                data
            });
        } catch (error) {
            return responderError(
                res,
                error,
                'Error al guardar el informe del técnico:'
            );
        }
    },

    /**
     * Finaliza el informe validando que
     * pertenezca al técnico.
     *
     * PATCH
     * /api/informe/tecnico/:idTecnico/detalles/:idOtDetalle/finalizar
     */
    async finalizarTecnico(req, res) {
        try {
            const {
                idTecnico,
                idOtDetalle
            } = req.params;

            const data =
                await informesService
                    .finalizarTecnico(
                        idTecnico,
                        idOtDetalle
                    );

            return res.status(200).json({
                success: true,
                message:
                    data?.message ||
                    (
                        data?.orden_finalizada
                            ? 'Informe y Orden de Trabajo finalizados correctamente'
                            : 'Informe del equipo finalizado correctamente'
                    ),
                data
            });
        } catch (error) {
            return responderError(
                res,
                error,
                'Error al finalizar el informe del técnico:'
            );
        }
    },

    /**
     * =====================================================
     * CONSULTAS DE ADMINISTRADOR / PLANNER
     * =====================================================
     */

    /**
     * Carga el informe sin validar técnico.
     *
     * GET /api/informe/detalles/:idOtDetalle
     */
    async getByOtDetalle(req, res) {
        try {
            const { idOtDetalle } = req.params;

            const data =
                await informesService
                    .getByOtDetalle(
                        idOtDetalle
                    );

            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            return responderError(
                res,
                error,
                'Error al cargar el informe:'
            );
        }
    },

    /**
     * Guarda o actualiza el informe sin validar técnico.
     *
     * PUT /api/informe/detalles/:idOtDetalle
     */
    async guardarInforme(req, res) {
        try {
            const { idOtDetalle } = req.params;

            const payload = req.body;

            const data =
                await informesService
                    .guardarInforme(
                        idOtDetalle,
                        payload
                    );

            return res.status(200).json({
                success: true,
                message:
                    data?.message ||
                    'Informe guardado correctamente',
                data
            });
        } catch (error) {
            return responderError(
                res,
                error,
                'Error al guardar el informe:'
            );
        }
    },

    /**
     * Finaliza el informe sin validar técnico.
     *
     * PATCH
     * /api/informe/detalles/:idOtDetalle/finalizar
     */
    async finalizar(req, res) {
        try {
            const { idOtDetalle } = req.params;

            const data =
                await informesService.finalizar(
                    idOtDetalle
                );

            return res.status(200).json({
                success: true,
                message:
                    data?.message ||
                    (
                        data?.orden_finalizada
                            ? 'Informe y Orden de Trabajo finalizados correctamente'
                            : 'Informe del equipo finalizado correctamente'
                    ),
                data
            });
        } catch (error) {
            return responderError(
                res,
                error,
                'Error al finalizar el informe:'
            );
        }
    },

    /**
     * =====================================================
     * CONSULTAS GENERALES
     * =====================================================
     */

    /**
     * Obtiene un informe básico por id_informe.
     *
     * GET /api/informe/:idInforme
     */
    async getById(req, res) {
        try {
            const { idInforme } = req.params;

            const data =
                await informesService.getById(
                    idInforme
                );

            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            return responderError(
                res,
                error,
                'Error al obtener el informe:'
            );
        }
    },

    /**
     * Obtiene el historial del equipo.
     *
     * GET
     * /api/informe/equipos/:idEquipo/historial
     *
     * Query opcional:
     * ?idOtDetalleActual=7
     */
    async getHistorialPorEquipo(req, res) {
        try {
            const { idEquipo } = req.params;

            const {
                idOtDetalleActual = null
            } = req.query;

            const data =
                await informesService
                    .getHistorialPorEquipo(
                        idEquipo,
                        idOtDetalleActual
                    );

            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            return responderError(
                res,
                error,
                'Error al obtener el historial del equipo:'
            );
        }
    },

    /**
     * Obtiene una entrada histórica completa.
     *
     * GET /api/informe/historial/:idInforme
     */
    async getHistorialDetalle(req, res) {
        try {
            const { idInforme } = req.params;

            const data =
                await informesService
                    .getHistorialDetalle(
                        idInforme
                    );

            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            return responderError(
                res,
                error,
                'Error al obtener el detalle histórico:'
            );
        }
    }
};

export default informesController;