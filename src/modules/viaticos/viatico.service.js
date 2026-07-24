import { viaticoModel } from './viatico.model.js';
import { subirImagenCloudinary } from '../servicios/images/image.service.js';
import { hasAnyRole, isSuperAdmin } from '../../utils/roles.js';

const ADMIN_ROLES = new Set(['ADMINISTRADOR', 'PLANNER']);
const TRANSICIONES_ESTADO = {
    registrado: ['validado', 'rechazado'],
    validado: ['pagado'],
    rechazado: [],
    pagado: []
};

const validarId = (valor, campo) => {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0) {
        const error = new Error(`${campo} no es válido`);
        error.statusCode = 400;
        throw error;
    }
    return id;
};

const validarAcceso = async (idOt, usuario, soloLider = false) => {
    const orden = await viaticoModel.getOrden(idOt);
    if (!orden) {
        const error = new Error('La Orden de Trabajo no existe');
        error.statusCode = 404;
        throw error;
    }

    const esLider = Number(orden.id_tecnico_responsable) === Number(usuario.id_usuario);
    const esSupervisor = ADMIN_ROLES.has(String(usuario.rol ?? '').trim().toUpperCase()) || isSuperAdmin(usuario);

    if (!esLider && !isSuperAdmin(usuario) && (soloLider || !esSupervisor)) {
        const error = new Error('Solo el técnico líder puede gestionar los gastos de esta OT');
        error.statusCode = 403;
        throw error;
    }
    return { orden, esLider };
};

const validarDatos = async (body = {}) => {
    const idSubcategoria = validarId(body.id_subcategoria, 'La subcategoría');
    const monto = Number(body.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
        const error = new Error('El monto debe ser mayor que cero');
        error.statusCode = 400;
        throw error;
    }
    if (!(await viaticoModel.existeSubcategoria(idSubcategoria))) {
        const error = new Error('La subcategoría seleccionada no existe');
        error.statusCode = 400;
        throw error;
    }
    const fecha = body.fecha_gasto ? new Date(body.fecha_gasto) : new Date();
    if (Number.isNaN(fecha.getTime())) {
        const error = new Error('La fecha del gasto no es válida');
        error.statusCode = 400;
        throw error;
    }
    return {
        idSubcategoria,
        monto: monto.toFixed(2),
        descripcion: String(body.descripcion ?? '').trim().slice(0, 255) || null,
        fechaGasto: fecha,
        comprobanteUrl: String(body.comprobante_url ?? '').trim().slice(0, 255) || null
    };
};

export const viaticoService = {
    async listarAdmin(usuario) {
        if (!hasAnyRole(usuario, 'ADMINISTRADOR')) {
            const error = new Error('Solo el Administrador puede consultar todos los viáticos');
            error.statusCode = 403;
            throw error;
        }
        const gastos = await viaticoModel.getAllAdmin();
        const total = gastos.reduce((suma, gasto) => suma + Number(gasto.monto || 0), 0);
        return { gastos, total_general: Number(total.toFixed(2)) };
    },

    async misPendientes(usuario) {
        const idTecnico = validarId(usuario?.id_usuario, 'El técnico');
        const gastos = await viaticoModel.getPendientesTecnico(idTecnico);
        const totalPorPagar = gastos
            .filter(gasto => gasto.estado === 'validado')
            .reduce((total, gasto) => total + Number(gasto.monto || 0), 0);
        return {
            gastos,
            total_por_pagar: Number(totalPorPagar.toFixed(2)),
            registrados: gastos.filter(gasto => gasto.estado === 'registrado').length,
            validados: gastos.filter(gasto => gasto.estado === 'validado').length,
            rechazados: gastos.filter(gasto => gasto.estado === 'rechazado').length
        };
    },

    async catalogos() {
        const rows = await viaticoModel.getCatalogos();
        const categorias = new Map();
        for (const row of rows) {
            if (!categorias.has(row.id_categoria)) {
                categorias.set(row.id_categoria, {
                    id_categoria: row.id_categoria,
                    nombre_categoria: row.nombre_categoria,
                    subcategorias: []
                });
            }
            categorias.get(row.id_categoria).subcategorias.push({
                id_subcategoria: row.id_subcategoria,
                nombre_subcategoria: row.nombre_subcategoria
            });
        }
        return [...categorias.values()];
    },

    async listar(idOtValue, usuario) {
        const idOt = validarId(idOtValue, 'La OT');
        const acceso = await validarAcceso(idOt, usuario);
        const gastos = await viaticoModel.getByOt(idOt);
        const total = gastos.reduce((suma, gasto) => suma + Number(gasto.monto || 0), 0);
        return {
            ...acceso,
            puedeCambiarEstado: hasAnyRole(usuario, 'ADMINISTRADOR'),
            gastos,
            total_gastado: Number(total.toFixed(2))
        };
    },

    async crear(idOtValue, body, usuario) {
        const idOt = validarId(idOtValue, 'La OT');
        await validarAcceso(idOt, usuario, true);
        const data = await validarDatos(body);
        const idViatico = await viaticoModel.create({ ...data, idOt });
        return { id_viatico: idViatico };
    },

    async subirComprobante(idOtValue, usuario, fileBuffer) {
        const idOt = validarId(idOtValue, 'La OT');
        await validarAcceso(idOt, usuario, true);
        if (!Buffer.isBuffer(fileBuffer)) {
            const error = new Error('Debe seleccionar una evidencia fotográfica');
            error.statusCode = 400;
            throw error;
        }
        return subirImagenCloudinary(fileBuffer);
    },

    async actualizar(idViaticoValue, body, usuario) {
        const idViatico = validarId(idViaticoValue, 'El gasto');
        const gasto = await viaticoModel.getById(idViatico);
        if (!gasto) {
            const error = new Error('El gasto no existe');
            error.statusCode = 404;
            throw error;
        }
        await validarAcceso(gasto.id_ot, usuario, true);
        if (!['registrado', 'rechazado'].includes(gasto.estado)) {
            const error = new Error('Un gasto validado o pagado ya no puede editarse');
            error.statusCode = 409;
            throw error;
        }
        const actualizado = await viaticoModel.update(idViatico, await validarDatos(body));
        return { id_viatico: idViatico, actualizado };
    },

    async cambiarEstado(idViaticoValue, estadoValue, usuario) {
        if (!hasAnyRole(usuario, 'ADMINISTRADOR')) {
            const error = new Error('Solo el Administrador puede cambiar el estado del gasto');
            error.statusCode = 403;
            throw error;
        }

        const idViatico = validarId(idViaticoValue, 'El gasto');
        const gasto = await viaticoModel.getById(idViatico);
        if (!gasto) {
            const error = new Error('El gasto no existe');
            error.statusCode = 404;
            throw error;
        }

        const estadoNuevo = String(estadoValue ?? '').trim().toLowerCase();
        const permitidos = TRANSICIONES_ESTADO[gasto.estado] ?? [];
        if (!permitidos.includes(estadoNuevo)) {
            const error = new Error(
                `No se puede cambiar de ${gasto.estado} a ${estadoNuevo || 'un estado vacío'}. El estado no puede retroceder.`
            );
            error.statusCode = 409;
            throw error;
        }

        const actualizado = await viaticoModel.updateEstado(
            idViatico,
            estadoNuevo,
            gasto.estado,
            validarId(usuario.id_usuario, 'El usuario validador')
        );
        if (!actualizado) {
            const error = new Error('El estado cambió durante la operación. Actualice e intente nuevamente');
            error.statusCode = 409;
            throw error;
        }
        return { id_viatico: idViatico, estado: estadoNuevo };
    },

    async eliminar(idViaticoValue, usuario) {
        const idViatico = validarId(idViaticoValue, 'El gasto');
        const gasto = await viaticoModel.getById(idViatico);
        if (!gasto) {
            const error = new Error('El gasto no existe');
            error.statusCode = 404;
            throw error;
        }
        await validarAcceso(gasto.id_ot, usuario, true);
        if (!(await viaticoModel.remove(idViatico))) {
            const error = new Error('Un gasto validado o pagado ya no puede eliminarse');
            error.statusCode = 409;
            throw error;
        }
        return { id_viatico: idViatico };
    }
};
