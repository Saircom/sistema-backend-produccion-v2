import Cotizacion from './cotizacion.model.js';

const validarCostos = cotizacionData => {
    if (cotizacionData.movilidad !== null && cotizacionData.movilidad !== undefined && cotizacionData.movilidad !== '') {
        const adicional = Number(cotizacionData.movilidad);
        if (!Number.isFinite(adicional) || adicional < 0) {
            const error = new Error('El costo adicional debe ser un monto válido mayor o igual a cero');
            error.statusCode = 400;
            throw error;
        }
    }

    for (const detalle of cotizacionData.detalles || []) {
        for (const servicio of detalle.idServicios || []) {
            const precio = servicio && typeof servicio === 'object' ? servicio.precio : null;
            if (precio === null || precio === undefined || precio === '' || !Number.isFinite(Number(precio)) || Number(precio) < 0) {
                const error = new Error('Cada subtipo de servicio debe tener un precio válido');
                error.statusCode = 400;
                throw error;
            }
        }
    }
};

const createCotizacionService = async (cotizacionData) => {
    // Regla de negocio: Validar que existan detalles
    if (!cotizacionData.detalles || cotizacionData.detalles.length === 0) {
        throw new Error("La cotización debe incluir al menos un servicio.");
    }
    validarCostos(cotizacionData);
    
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

const updateCotizacionService = async (id, data, { rol } = {}) => {
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
        const error = new Error('La cotización debe incluir al menos un servicio');
        error.statusCode = 400;
        throw error;
    }
    validarCostos(data);

    const estadoActual = await Cotizacion.getEstadoById(idCotizacion);
    if (!estadoActual) {
        const error = new Error('La cotización no existe');
        error.statusCode = 404;
        throw error;
    }
    const esSuperadministrador = String(rol ?? '').trim().toUpperCase() === 'SUPERADMINISTRADOR';
    const puedeEditar = esSuperadministrador || estadoActual === 'borrador';

    if (!puedeEditar) {
        const error = new Error(
            estadoActual === 'aprobada'
                ? 'Solo el Superadministrador puede editar una cotización aprobada'
                : 'Solo se pueden editar cotizaciones en estado borrador'
        );
        error.statusCode = 409;
        throw error;
    }

    await Cotizacion.update(idCotizacion, data, data.detalles, estadoActual);
    return await Cotizacion.getById(idCotizacion);
};

const updateEstadoService = async (id, estado, { rol } = {}) => {
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

    const esSuperadministrador = String(rol ?? '').trim().toUpperCase() === 'SUPERADMINISTRADOR';
    const estadosPermitidos = esSuperadministrador
        ? ESTADOS_COTIZACION.filter(valor => valor !== estadoActual)
        : (TRANSICIONES_COTIZACION[estadoActual] ?? []);

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
