import { movilidadModel } from './movilidad.model.js';

const calcularAlertaMantenimiento = (movilidad) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const valorFecha = movilidad.proxima_fecha_mantenimiento;
    const fecha = valorFecha ? new Date(valorFecha) : null;
    if (fecha && !Number.isNaN(fecha.getTime())) fecha.setHours(0, 0, 0, 0);
    const diasRestantes = fecha ? Math.ceil((fecha - hoy) / 86400000) : null;
    const kmRestantes = movilidad.proximo_kilometraje == null ? null
        : Number(movilidad.proximo_kilometraje) - Number(movilidad.kilometraje_actual || 0);
    const vencido = (diasRestantes !== null && diasRestantes < 0)
        || (kmRestantes !== null && kmRestantes <= 0);
    const proximo = !vencido && (
        (diasRestantes !== null && diasRestantes <= Number(movilidad.dias_alerta || 30))
        || (kmRestantes !== null && kmRestantes <= Number(movilidad.kilometros_alerta || 500))
    );
    return {
        estado: vencido ? 'Vencido' : proximo ? 'Proximo' : (fecha || kmRestantes !== null) ? 'Al dia' : 'Sin programar',
        dias_restantes: diasRestantes,
        kilometros_restantes: kmRestantes
    };
};

const conAlerta = movilidad => ({ ...movilidad, alerta_mantenimiento: calcularAlertaMantenimiento(movilidad) });

export const movilidadService = {

    async createMovilidad(data) {
        // Validaciones básicas antes de enviar al modelo
        if (!data.placa || !data.marca || !data.modelo) {
            throw new Error("Datos incompletos: la placa, marca y modelo son obligatorios.");
        }

        // Opcional: Validar que el kilometraje sea un número positivo
        if (data.kilometraje_actual < 0) {
            throw new Error("El kilometraje no puede ser negativo.");
        }

        // En el servicio, cambia:
        return await movilidadModel.createMovilidad(data); // Antes era .create
    },
    // --- Gestión de Movilidades ---
    async getAllMovilidades() {
        const movilidades = await movilidadModel.getAll();
        return movilidades.map(conAlerta);
    },

    async getDetalleMovilidad(id) {
        // Obtenemos todo el conjunto de datos necesario para el frontend
        const movilidad = await movilidadModel.getById(id);
        if (!movilidad) throw new Error("Movilidad no encontrada");

        // Obtenemos los historiales relacionados desde las nuevas tablas
        const mantenimientos = await movilidadModel.getHistorialMantenimiento(id);
        const documentos = await movilidadModel.getDocumentos(id);

        const programacion = mantenimientos.find(item =>
            item.proxima_fecha_mantenimiento || item.proximo_kilometraje != null
        ) || {};

        return conAlerta({
            ...movilidad,
            proxima_fecha_mantenimiento: programacion.proxima_fecha_mantenimiento || null,
            proximo_kilometraje: programacion.proximo_kilometraje ?? null,
            dias_alerta: programacion.dias_alerta ?? 30,
            kilometros_alerta: programacion.kilometros_alerta ?? 500,
            historial_mantenimientos: mantenimientos,
            documentos: documentos
        });
    },

    async actualizarMovilidad(id, data) {
        const idMovilidad = Number(id);
        if (!Number.isInteger(idMovilidad) || idMovilidad <= 0) {
            throw new Error('El ID de la movilidad no es válido');
        }

        const placa = String(data.placa || '').trim().toUpperCase();
        const marca = String(data.marca || '').trim();
        const modelo = String(data.modelo || '').trim();
        const tipoVehiculo = String(data.tipo_vehiculo || '').trim();
        const kilometraje = Number(data.kilometraje_actual);
        const estadoRecibido = String(data.estado_disponibilidad || '').trim().toLowerCase();
        const estados = {
            disponible: 'Disponible',
            'en mantenimiento': 'En mantenimiento',
            'en uso': 'En uso',
            ocupado: 'En uso'
        };

        if (!placa || !marca || !modelo || !tipoVehiculo) {
            throw new Error('La placa, marca, modelo y tipo de vehículo son obligatorios');
        }
        if (!Number.isInteger(kilometraje) || kilometraje < 0) {
            throw new Error('El kilometraje debe ser un número entero mayor o igual a cero');
        }
        if (!estados[estadoRecibido]) {
            throw new Error('El estado de disponibilidad no es válido');
        }

        return movilidadModel.updateMovilidad(idMovilidad, {
            placa,
            marca,
            modelo,
            tipo_vehiculo: tipoVehiculo,
            kilometraje_actual: kilometraje,
            estado_disponibilidad: estados[estadoRecibido]
        });
    },

    // --- Gestión de Mantenimientos (Historial Técnico) ---
    async registrarMantenimiento(data) {
        // Validamos que el kilometraje sea lógico
        const kilometraje = Number(data.kilometraje_al_momento);
        const proximoKilometraje = data.proximo_kilometraje === '' || data.proximo_kilometraje == null
            ? null : Number(data.proximo_kilometraje);
        const diasAlerta = Number(data.dias_alerta ?? 30);
        const kilometrosAlerta = Number(data.kilometros_alerta ?? 500);

        if (!Number.isInteger(kilometraje) || kilometraje < 0) throw new Error("El kilometraje no puede ser negativo");
        if (proximoKilometraje !== null && (!Number.isInteger(proximoKilometraje) || proximoKilometraje <= kilometraje)) {
            throw new Error('El proximo kilometraje debe ser mayor al kilometraje actual');
        }
        if (!data.proxima_fecha_mantenimiento && proximoKilometraje === null) {
            throw new Error('Indique la proxima fecha o el proximo kilometraje');
        }
        if (!Number.isInteger(diasAlerta) || diasAlerta < 0 || !Number.isInteger(kilometrosAlerta) || kilometrosAlerta < 0) {
            throw new Error('Los margenes de alerta no son validos');
        }

        return movilidadModel.registrarMantenimiento({
            ...data,
            kilometraje_al_momento: kilometraje,
            proximo_kilometraje: proximoKilometraje,
            dias_alerta: diasAlerta,
            kilometros_alerta: kilometrosAlerta
        });
    },

    async registrarDocumento(data, fileBuffer) {

        if (new Date(data.fecha_vencimiento) < new Date()) {
            console.warn("Se está registrando un documento vencido");
        }

        return await movilidadModel.registrarDocumento(data, fileBuffer);
    },

    // --- Métodos de utilidad ---
    async asignarEstado(id_movilidad, nuevoEstado) {
        const estadosValidos = ['Disponible', 'Ocupado', 'En Mantenimiento'];
        if (!estadosValidos.includes(nuevoEstado)) {
            throw new Error("Estado de movilidad no válido");
        }
        return await movilidadModel.updateEstado(id_movilidad, nuevoEstado);
    },

    async eliminarMovilidad(id) {
        return await movilidadModel.delete(id);
    }
};
