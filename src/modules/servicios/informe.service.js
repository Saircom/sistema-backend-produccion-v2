// src/modules/informes/informe.service.js
import { informesRepository } from './informe.repository.js';

/**
 * Convierte y valida un identificador numérico.
 */
const validarId = (valor, nombreCampo) => {
    const id = Number(valor);

    if (!Number.isInteger(id) || id <= 0) {
        const error = new Error(
            `${nombreCampo} no es válido`
        );

        error.statusCode = 400;
        throw error;
    }

    return id;
};

/**
 * Valida que el payload enviado sea un objeto.
 */
const validarPayload = (payload) => {
    if (
        !payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload)
    ) {
        const error = new Error(
            'Los datos del informe no son válidos'
        );

        error.statusCode = 400;
        throw error;
    }

    return payload;
};

/**
 * Convierte undefined en null, pero conserva:
 * - cadenas vacías
 * - cero
 * - false
 */
const normalizarValor = (valor) => {
    return valor === undefined
        ? null
        : valor;
};

/**
 * Recibe un objeto o un arreglo y devuelve
 * solamente el primer registro.
 */
const obtenerPrimerRegistro = (valor) => {
    if (Array.isArray(valor)) {
        return valor[0] ?? {};
    }

    if (
        valor &&
        typeof valor === 'object'
    ) {
        return valor;
    }

    return {};
};

/**
 * Elimina campos de control que no deben enviarse
 * a las tablas hijas.
 */
const limpiarSeccion = (seccion) => {
    const registro =
        obtenerPrimerRegistro(seccion);

    const camposIgnorados = new Set([
        'id',
        'id_informe',
        'id_ot',
        'id_ot_detalle',
        'id_equipo',
        'id_tecnico',
        'idTecnico',
        'idInforme',
        'idOt',
        'idOtDetalle',
        'idEquipo',
        'fecha_registro',
        'fecha_actualizacion',
        'created_at',
        'updated_at'
    ]);

    return Object.fromEntries(
        Object.entries(registro)
            .filter(
                ([clave]) =>
                    !camposIgnorados.has(clave)
            )
            .map(([clave, valor]) => [
                clave,
                normalizarValor(valor)
            ])
    );
};

/**
 * Normaliza filtros y componentes.
 *
 * En tu formulario actual esta sección se maneja
 * como un objeto con muchas columnas.
 */
const normalizarFiltros = (valor) => {
    if (Array.isArray(valor)) {
        return valor.map(limpiarSeccion);
    }

    return limpiarSeccion(valor);
};

const CAMPOS_NO_CONTABILIZABLES = new Set([
    'id',
    'id_informe',
    'id_lectura',
    'id_lectura_compresor',
    'id_lectura_secador',
    'id_voltaje_amperaje',
    'created_at',
    'updated_at'
]);

const tieneDatoReal = (seccion) => {
    const registros = Array.isArray(seccion) ? seccion : [seccion];

    return registros.some(registro =>
        registro
        && typeof registro === 'object'
        && Object.entries(registro).some(([campo, valor]) => {
            if (
                CAMPOS_NO_CONTABILIZABLES.has(campo)
                || campo.startsWith('id_')
                || campo.startsWith('fecha_')
            ) {
                return false;
            }

            return valor !== null
                && valor !== undefined
                && (typeof valor !== 'string' || valor.trim() !== '');
        })
    );
};

const validarContenidoMinimo = (detalle) => {
    const secciones = [
        ['lecturas_compresor', 'lectura del compresor'],
        ['lecturas_secador', 'lectura del secador'],
        ['voltaje_amperaje', 'lectura de voltaje y amperaje']
    ];

    const faltantes = secciones
        .filter(([campo]) => !tieneDatoReal(detalle?.[campo]))
        .map(([, etiqueta]) => etiqueta);

    if (!Array.isArray(detalle?.imagenes_servicio) || detalle.imagenes_servicio.length < 5) {
        faltantes.push('5 evidencias fotográficas como mínimo');
    }

    if (faltantes.length > 0) {
        const error = new Error(
            `No puede finalizar el informe. Debe completar al menos un dato en: ${faltantes.join(', ')}.`
        );
        error.statusCode = 400;
        throw error;
    }
};

/**
 * Prepara únicamente las secciones aceptadas
 * por informesRepository.guardarInforme().
 */
const normalizarPayloadInforme = (payload) => {
    const datos = validarPayload(payload);

    const resultado = {};

    if (Object.prototype.hasOwnProperty.call(datos, 'lecturas_compresor')) {
        resultado.lecturas_compresor =
            limpiarSeccion(datos.lecturas_compresor);
    }

    if (Object.prototype.hasOwnProperty.call(datos, 'lecturas_secador')) {
        resultado.lecturas_secador =
            limpiarSeccion(datos.lecturas_secador);
    }

    if (Object.prototype.hasOwnProperty.call(datos, 'voltaje_amperaje')) {
        resultado.voltaje_amperaje =
            limpiarSeccion(datos.voltaje_amperaje);
    }

    if (Object.prototype.hasOwnProperty.call(datos, 'filtros_y_componentes')) {
        resultado.filtros_y_componentes =
            normalizarFiltros(datos.filtros_y_componentes);
    }

    if (Object.prototype.hasOwnProperty.call(datos, 'detalle_informe')) {
        resultado.detalle_informe =
            limpiarSeccion(datos.detalle_informe);
    }

    if (Object.prototype.hasOwnProperty.call(datos, 'servicio_responsable')) {
        resultado.servicio_responsable =
            limpiarSeccion(datos.servicio_responsable);
    }

    if (Object.prototype.hasOwnProperty.call(datos, 'cierre_responsable')) {
        resultado.cierre_responsable =
            limpiarSeccion(datos.cierre_responsable);
    }

    if (Object.prototype.hasOwnProperty.call(datos, 'imagenes_servicio')) {
        resultado.imagenes_servicio =
            Array.isArray(datos.imagenes_servicio)
                ? datos.imagenes_servicio.map(limpiarSeccion)
                : [];
    }

    return resultado;
};

export const informesService = {
    /**
     * Obtiene el informe mediante id_informe.
     *
     * GET /api/informe/:idInforme
     */
    async getById(idInforme) {
        const informeId = validarId(
            idInforme,
            'El ID del informe'
        );

        const informe =
            await informesRepository
                .obtenerInformePorId(
                    informeId
                );

        if (!informe) {
            const error = new Error(
                'El informe solicitado no existe'
            );

            error.statusCode = 404;
            throw error;
        }

        return informe;
    },

    /**
     * Obtiene toda la información del informe mediante
     * el detalle de la Orden de Trabajo.
     *
     * Uso: administrador o Planner.
     *
     * GET /api/informe/detalles/:idOtDetalle
     */
    async getByOtDetalle(idOtDetalle) {
        const detalleId = validarId(
            idOtDetalle,
            'El ID del detalle de la OT'
        );

        const resultado =
            await informesRepository
                .getByOtDetalle(detalleId);

        if (!resultado) {
            const error = new Error(
                'El detalle de la Orden de Trabajo no existe'
            );

            error.statusCode = 404;
            throw error;
        }

        return resultado;
    },

    /**
     * Obtiene toda la información validando que
     * la OT pertenezca al técnico.
     *
     * GET
     * /api/informe/tecnico/:idTecnico/detalles/:idOtDetalle
     */
    async getByOtDetalleTecnico(
        idTecnico,
        idOtDetalle
    ) {
        const tecnicoId = validarId(
            idTecnico,
            'El ID del técnico'
        );

        const detalleId = validarId(
            idOtDetalle,
            'El ID del detalle de la OT'
        );

        const resultado =
            await informesRepository
                .getByOtDetalle(
                    detalleId,
                    tecnicoId
                );

        if (!resultado) {
            const error = new Error(
                'El detalle no existe o no pertenece al técnico'
            );

            error.statusCode = 404;
            throw error;
        }

        return resultado;
    },

    /**
     * Guarda el informe como administrador o Planner.
     *
     * PUT /api/informe/detalles/:idOtDetalle
     */
    async guardarInforme(
        idOtDetalle,
        payload
    ) {
        const detalleId = validarId(
            idOtDetalle,
            'El ID del detalle de la OT'
        );

        const datos =
            normalizarPayloadInforme(payload);

        const resultado =
            await informesRepository
                .guardarInforme(
                    detalleId,
                    datos
                );

        return {
            ...resultado,
            message:
                'Informe guardado correctamente'
        };
    },

    /**
     * Guarda el informe validando al técnico asignado.
     *
     * PUT
     * /api/informe/tecnico/:idTecnico/detalles/:idOtDetalle
     */
    async guardarInformeTecnico(
        idTecnico,
        idOtDetalle,
        payload
    ) {
        const tecnicoId = validarId(
            idTecnico,
            'El ID del técnico'
        );

        const detalleId = validarId(
            idOtDetalle,
            'El ID del detalle de la OT'
        );

        const datos =
            normalizarPayloadInforme(payload);

        const resultado =
            await informesRepository
                .guardarInforme(
                    detalleId,
                    datos,
                    tecnicoId
                );

        return {
            ...resultado,
            message:
                'Informe técnico guardado correctamente'
        };
    },

    /**
     * Finaliza un informe sin validar técnico.
     *
     * PATCH
     * /api/informe/detalles/:idOtDetalle/finalizar
     */
    async finalizar(idOtDetalle) {
        const detalleId = validarId(
            idOtDetalle,
            'El ID del detalle de la OT'
        );

        /*
         * Verifica primero que el detalle exista.
         */
        const detalle =
            await informesRepository
                .obtenerDatosDetalle(detalleId);

        if (!detalle) {
            const error = new Error(
                'El detalle de la Orden de Trabajo no existe'
            );

            error.statusCode = 404;
            throw error;
        }

        const resultado =
            await informesRepository
                .finalizarInforme(detalleId);

        return {
            ...resultado,
            message: 'Informe finalizado correctamente. La Orden de Trabajo queda pendiente de cierre por Planner o Administrador.'
        };
    },

    /**
     * Finaliza el informe validando al técnico.
     *
     * PATCH
     * /api/informe/tecnico/:idTecnico/detalles/:idOtDetalle/finalizar
     */
    async finalizarTecnico(
        idTecnico,
        idOtDetalle
    ) {
        const tecnicoId = validarId(
            idTecnico,
            'El ID del técnico'
        );

        const detalleId = validarId(
            idOtDetalle,
            'El ID del detalle de la OT'
        );

        /*
         * El repositorio valida la relación entre
         * el detalle y el técnico.
         */
        const detalle =
            await informesRepository
                .obtenerDatosDetalle(
                    detalleId,
                    tecnicoId
                );

        if (!detalle) {
            const error = new Error(
                'El detalle no existe o no pertenece al técnico'
            );

            error.statusCode = 404;
            throw error;
        }

        const informe =
            await informesRepository
                .buscarInformePorOtDetalle(
                    detalleId
                );

        if (!informe) {
            const error = new Error(
                'Debe guardar el informe antes de finalizarlo'
            );

            error.statusCode = 400;
            throw error;
        }

        if (informe.fecha_finalizacion) {
            const error = new Error(
                'El informe ya se encuentra finalizado'
            );

            error.statusCode = 409;
            throw error;
        }

        const contenido = await informesRepository.getByOtDetalle(
            detalleId,
            tecnicoId
        );
        validarContenidoMinimo(contenido);

        const resultado =
            await informesRepository
                .finalizarInforme(detalleId);

        return {
            ...resultado,
            message: 'Informe finalizado correctamente. La Orden de Trabajo queda pendiente de cierre por Planner o Administrador.'
        };
    },

    /**
     * Obtiene el historial del equipo.
     *
     * GET
     * /api/informe/equipos/:idEquipo/historial
     */
    async getHistorialPorEquipo(
        idEquipo,
        idOtDetalleActual = null
    ) {
        const equipoId = validarId(
            idEquipo,
            'El ID del equipo'
        );

        let detalleActual = null;

        if (
            idOtDetalleActual !== null &&
            idOtDetalleActual !== undefined &&
            idOtDetalleActual !== ''
        ) {
            detalleActual = validarId(
                idOtDetalleActual,
                'El ID del detalle actual'
            );
        }

        return await informesRepository
            .obtenerHistorialPorEquipo(
                equipoId,
                detalleActual
            );
    },

    /**
     * Obtiene un informe histórico completo.
     *
     * GET /api/informe/historial/:idInforme
     */
    async getHistorialDetalle(idInforme) {
        const informeId = validarId(idInforme, 'El ID del informe');

        const resultado =
            await informesRepository.obtenerHistorialDetalle(informeId);

        if (!resultado) {
            const error = new Error('El informe histórico no existe');
            error.statusCode = 404;
            throw error;
        }

        return resultado;
    }
};

export default informesService;
