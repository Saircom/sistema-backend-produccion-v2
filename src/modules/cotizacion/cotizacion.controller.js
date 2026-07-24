import service from './cotizacion.service.js';

const postCotizacion = async (req, res) => {
    try {
        // El token decodificado contiene 'id_usuario', no 'id'
        const idUsuarioLogueado = req.user?.id_usuario;

        if (!idUsuarioLogueado) {
            console.error("Error: Token validado pero no contiene 'id_usuario'. Datos en req.user:", req.user);
            return res.status(401).json({
                success: false,
                message: "No autorizado: ID de usuario no encontrado en el token."
            });
        }

        const dataParaCrear = {
            ...req.body,
            idUsuarioCreador: idUsuarioLogueado
        };

        const idCotizacion = await service.createCotizacionService(dataParaCrear);
        res.status(201).json({
            success: true,
            message: "Cotización creada correctamente",
            id: idCotizacion
        });
    } catch (error) {
        console.error("Error al crear cotización:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAllCotizaciones = async (req, res) => {
    try {
        const rol = String(req.user?.rol ?? '').trim().toUpperCase();
        const idUsuario = Number(req.user?.id_usuario);

        if (rol === 'POSTVENTA' && (!Number.isInteger(idUsuario) || idUsuario <= 0)) {
            return res.status(401).json({
                success: false,
                message: 'No se pudo identificar al usuario de Postventa'
            });
        }

        const cotizaciones = await service.getAllCotizacionesService({
            rol,
            idUsuario
        });
        res.status(200).json(cotizaciones);
    } catch (error) {
        console.error("Error al obtener lista:", error);
        res.status(500).json({ success: false, message: "Error al obtener las cotizaciones" });
    }
};

const getCotizacionById = async (req, res) => {
    try {
        const { id } = req.params;
        const cotizacion = await service.getCotizacionByIdService(id);
        res.status(200).json(cotizacion);
    } catch (error) {
        console.error("Error al obtener detalle:", error);
        res.status(404).json({ success: false, message: error.message });
    }
};

const updateEstado = async (req, res) => {
    try {
        const resultado = await service.updateEstadoService(
            req.params.id,
            req.body?.estado
        );

        return res.status(200).json({
            success: true,
            message: 'Estado de la cotización actualizado correctamente',
            data: resultado
        });
    } catch (error) {
        const status = error.statusCode || 500;
        if (status >= 500) {
            console.error('Error al actualizar el estado de la cotización:', error);
        }
        return res.status(status).json({
            success: false,
            message: error.message || 'No se pudo actualizar el estado de la cotización'
        });
    }
};

const updateCotizacion = async (req, res) => {
    try {
        const resultado = await service.updateCotizacionService(
            req.params.id,
            req.body
        );
        return res.status(200).json({
            success: true,
            message: 'Cotización actualizada correctamente',
            data: resultado
        });
    } catch (error) {
        const status = error.statusCode || 500;
        if (status >= 500) console.error('Error al actualizar la cotización:', error);
        return res.status(status).json({
            success: false,
            message: error.message || 'No se pudo actualizar la cotización'
        });
    }
};

export default {
    updateCotizacion,
    updateEstado,
    postCotizacion,
    getAllCotizaciones,
    getCotizacionById
};
