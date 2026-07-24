import Cotizacion from './cotizacion.model.js';

const createCotizacionService = async (cotizacionData) => {
    // Regla de negocio: Validar que existan detalles
    if (!cotizacionData.detalles || cotizacionData.detalles.length === 0) {
        throw new Error("La cotización debe incluir al menos un equipo y un servicio.");
    }
    
    // Llamar al modelo para la persistencia
    return await Cotizacion.create(cotizacionData, cotizacionData.detalles);
};

const getAllCotizacionesService = async ({ rol, idUsuario } = {}) => {
    const idUsuarioCreador = rol === 'POSTVENTA' ? idUsuario : null;
    return await Cotizacion.getAll(idUsuarioCreador);
};

const getCotizacionByIdService = async (id) => {
    const cotizacion = await Cotizacion.getById(id);
    if (!cotizacion || cotizacion.length === 0) {
        throw new Error("Cotización no encontrada.");
    }
    return cotizacion;
};

const ESTADOS_COTIZACION = ['borrador', 'enviada', 'aprobada', 'rechazada'];
const TRANSICIONES_COTIZACION = {
    borrador: ['enviada'],
    enviada: ['aprobada', 'rechazada'],
    aprobada: [],
    rechazada: []
};

const updateCotizacionService = async (id, data) => {
    const idCotizacion = Number(id);
    if (!Number.isInteger(idCotizacion) || idCotizacion <= 0) {
        const error = new Error('El ID de la cotización no es válido');
        error.statusCode = 400;
        throw error;
    }
    if (!data?.idCliente || !data?.tipoPago || !data?.centroCosto) {
        const error = new Error('Cliente, tipo de pago y centro de costo son obligatorios');
        error.statusCode = 400;
        throw error;
    }
    if (!Array.isArray(data.detalles) || data.detalles.length === 0) {
        const error = new Error('La cotización debe incluir al menos un equipo y un servicio');
        error.statusCode = 400;
        throw error;
    }

    const estadoActual = await Cotizacion.getEstadoById(idCotizacion);
    if (!estadoActual) {
        const error = new Error('La cotización no existe');
        error.statusCode = 404;
        throw error;
    }
    if (estadoActual !== 'borrador') {
        const error = new Error('Solo se pueden editar cotizaciones en estado borrador');
        error.statusCode = 409;
        throw error;
    }

    await Cotizacion.update(idCotizacion, data, data.detalles);
    return await Cotizacion.getById(idCotizacion);
};

const updateEstadoService = async (id, estado) => {
    const idCotizacion = Number(id);
    const estadoNormalizado = String(estado ?? '').trim().toLowerCase();

    if (!Number.isInteger(idCotizacion) || idCotizacion <= 0) {
        const error = new Error('El ID de la cotización no es válido');
        error.statusCode = 400;
        throw error;
    }

    if (!ESTADOS_COTIZACION.includes(estadoNormalizado)) {
        const error = new Error(
            `Estado no válido. Valores permitidos: ${ESTADOS_COTIZACION.join(', ')}`
        );
        error.statusCode = 400;
        throw error;
    }

    const estadoActual = await Cotizacion.getEstadoById(idCotizacion);

    if (!estadoActual) {
        const error = new Error('La cotización no existe');
        error.statusCode = 404;
        throw error;
    }

    if (estadoActual === estadoNormalizado) {
        return { id_cotizacion: idCotizacion, estado: estadoActual };
    }

    const estadosPermitidos = TRANSICIONES_COTIZACION[estadoActual] ?? [];

    if (!estadosPermitidos.includes(estadoNormalizado)) {
        const siguiente = estadosPermitidos.length
            ? estadosPermitidos.join(' o ')
            : 'ninguno; el estado actual es final';
        const error = new Error(
            `No se puede cambiar de ${estadoActual} a ${estadoNormalizado}. Siguiente estado permitido: ${siguiente}`
        );
        error.statusCode = 409;
        throw error;
    }

    const actualizado = await Cotizacion.updateEstado(
        idCotizacion,
        estadoNormalizado,
        estadoActual
    );

    if (!actualizado) {
        const error = new Error(
            'El estado cambió durante la operación. Actualice la página e intente nuevamente.'
        );
        error.statusCode = 409;
        throw error;
    }

    return { id_cotizacion: idCotizacion, estado: estadoNormalizado };
};

export default {
    updateCotizacionService,
    updateEstadoService,
    createCotizacionService, 
    getAllCotizacionesService, 
    getCotizacionByIdService 
};
