import TiempoService from './tiempo.service.js';

class TiempoController {
    static async listar(req, res) {
        try {
            const data = await TiempoService.listar();
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Error al listar tiempos:', error);
            return res.status(500).json({
                success: false,
                message: 'No se pudo obtener el historial de tiempos'
            });
        }
    }

    /**
     * Obtiene los tiempos de un equipo dentro de la OT.
     */
    static async obtener(req, res) {
        try {
            const data = await TiempoService.obtener(
                req.params.id_ot_detalle
            );

            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error al obtener tiempos:', error);

            const mensaje = error.message.toLowerCase();

            const status = mensaje.includes('no se encontró')
                ? 404
                : mensaje.includes('no es válido')
                    ? 400
                    : 500;

            return res.status(status).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Registra la llegada del técnico al equipo.
     */
    static async registrarLlegada(req, res) {
        try {
            const data = await TiempoService.registrarLlegada(
                req.params.id_ot_detalle
            );

            return res.status(200).json({
                success: true,
                message: 'Llegada registrada correctamente',
                data
            });
        } catch (error) {
            console.error('Error al registrar llegada:', error);

            const mensaje = error.message.toLowerCase();

            if (
                mensaje.includes('ya fue registrada') ||
                mensaje.includes('ya avanzó')
            ) {
                return res.status(409).json({
                    success: false,
                    yaRegistrado: true,
                    message: error.message
                });
            }

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Registra el inicio del trabajo del equipo.
     */
    static async registrarInicio(req, res) {
        try {
            const data = await TiempoService.registrarInicio(
                req.params.id_ot_detalle
            );

            return res.status(200).json({
                success: true,
                message: 'Inicio registrado correctamente',
                data
            });
        } catch (error) {
            console.error('Error al registrar inicio:', error);

            const mensaje = error.message.toLowerCase();

            if (mensaje.includes('registrar la llegada')) {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }

            if (
                mensaje.includes('ya fue registrada') ||
                mensaje.includes('ya fue registrado') ||
                mensaje.includes('ya fue finalizado')
            ) {
                return res.status(409).json({
                    success: false,
                    yaRegistrado: true,
                    message: error.message
                });
            }

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Registra la finalización del trabajo del equipo.
     */
    static async registrarFin(req, res) {
        try {
            const data = await TiempoService.registrarFin(
                req.params.id_ot_detalle
            );

            return res.status(200).json({
                success: true,
                message: 'Fin registrado correctamente',
                data
            });
        } catch (error) {
            console.error('Error al registrar fin:', error);

            const mensaje = error.message.toLowerCase();

            if (mensaje.includes('registrar el inicio')) {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }

            if (
                mensaje.includes('ya fue registrada') ||
                mensaje.includes('ya fue finalizado')
            ) {
                return res.status(409).json({
                    success: false,
                    yaRegistrado: true,
                    message: error.message
                });
            }

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default TiempoController;
