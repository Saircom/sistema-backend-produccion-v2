import db from '../../config/db.js';

let preparacionEsquema = null;

const asegurarColumnaMovilidad = () => {
    if (!preparacionEsquema) {
        preparacionEsquema = (async () => {
            const [columnas] = await db.execute(
                `SELECT 1 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'cotizaciones'
                   AND COLUMN_NAME = 'movilidad'`
            );

            if (columnas.length === 0) {
                await db.query(
                    `ALTER TABLE cotizaciones
                     ADD COLUMN movilidad DECIMAL(12,2) NULL DEFAULT NULL AFTER centro_costo`
                );
            }
        })().catch(error => {
            preparacionEsquema = null;
            throw error;
        });
    }

    return preparacionEsquema;
};

const normalizarServicioCotizado = servicio => {
    const esObjeto = servicio && typeof servicio === 'object';
    const idSubtipoServicio = Number(
        esObjeto
            ? (servicio.idSubtipoServicio ?? servicio.id_subtipo_servicio ?? servicio.value)
            : servicio
    );
    const precioCrudo = esObjeto ? (servicio.precio ?? null) : null;
    const precio = precioCrudo === '' || precioCrudo === null || precioCrudo === undefined
        ? null
        : Number(precioCrudo);

    if (!Number.isInteger(idSubtipoServicio) || idSubtipoServicio <= 0) {
        throw new Error('El subtipo de servicio no es válido');
    }
    if (precio !== null && (!Number.isFinite(precio) || precio < 0)) {
        throw new Error('El precio del servicio debe ser un monto válido mayor o igual a cero');
    }
    return { idSubtipoServicio, precio };
};

const normalizarCostoAdicional = valor => {
    if (valor === '' || valor === null || valor === undefined) return null;
    const costo = Number(valor);
    if (!Number.isFinite(costo) || costo < 0) {
        throw new Error('El costo adicional debe ser un monto válido mayor o igual a cero');
    }
    return costo;
};

const Cotizacion = {
    /**
     * Crea una cotización con múltiples equipos y subtipos de servicio.
     */
    create: async (data, detalles = []) => {
        await asegurarColumnaMovilidad();
        const connection = await db.getConnection();
        let bloqueoObtenido = false;

        try {
            await connection.beginTransaction();

            if (!data.idCliente) {
                throw new Error('El cliente es obligatorio');
            }

            if (!Array.isArray(detalles) || detalles.length === 0) {
                throw new Error('Debe agregar al menos un detalle');
            }

            /*
             * Evita que dos usuarios generen el mismo correlativo.
             * El bloqueo se libera al finalizar la operación.
             */
            const [lockRows] = await connection.execute(
                `SELECT GET_LOCK('correlativo_cotizaciones', 10) AS bloqueado`
            );

            bloqueoObtenido = lockRows[0]?.bloqueado === 1;

            if (!bloqueoObtenido) {
                throw new Error(
                    'No se pudo generar el número de cotización. Intente nuevamente.'
                );
            }

            /*
             * numero_cotizacion puede ser INT o VARCHAR con números simples:
             * 1, 2, 3, 4...
             */
            const numeroTemporal = `TEMP-${Date.now()}`;

            const sqlCabecera = `
                INSERT INTO cotizaciones (
                    numero_cotizacion,
                    id_cliente,
                    tipo_pago,
                    centro_costo,
                    movilidad,
                    nota,
                    estado,
                    id_usuario_creador
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [resultadoCabecera] = await connection.execute(
                sqlCabecera,
                [
                    numeroTemporal,
                    data.idCliente,
                    data.tipoPago || null,
                    data.centroCosto || null,
                    normalizarCostoAdicional(data.movilidad),
                    data.nota?.trim() || null,
                    data.estado || 'borrador',
                    data.idUsuarioCreador || null
                ]
            );

            const idCotizacion = resultadoCabecera.insertId;
            const numeroCotizacion = `COT-${idCotizacion}`;

            await connection.execute(
                `UPDATE cotizaciones
                 SET numero_cotizacion = ?
                 WHERE id_cotizacion = ?`,
                [numeroCotizacion, idCotizacion]
            );

            const sqlDetalle = `
                INSERT INTO cotizacion_detalles (
                    id_cotizacion,
                    id_equipo,
                    id_subtipo_servicio,
                    precio
                )
                VALUES (?, ?, ?, ?)
            `;

            for (const detalle of detalles) {
                const subtipos = Array.isArray(detalle.idServicios)
                    ? detalle.idServicios
                    : detalle.idServicio
                        ? [detalle.idServicio]
                        : [];

                if (subtipos.length === 0) {
                    throw new Error(
                        'Cada detalle debe tener al menos un subtipo de servicio'
                    );
                }

                for (const servicio of subtipos) {
                    const { idSubtipoServicio, precio } = normalizarServicioCotizado(servicio);
                    await connection.execute(sqlDetalle, [
                        idCotizacion,
                        detalle.idEquipo || null,
                        idSubtipoServicio,
                        precio
                    ]);
                }
            }

            await connection.commit();

            return {
                idCotizacion,
                numeroCotizacion
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            if (bloqueoObtenido) {
                try {
                    await connection.execute(
                        `SELECT RELEASE_LOCK('correlativo_cotizaciones')`
                    );
                } catch (error) {
                    console.error(
                        'Error al liberar el bloqueo del correlativo:',
                        error
                    );
                }
            }

            connection.release();
        }
    },
    getEstadoById: async (idCotizacion) => {
        const [rows] = await db.execute(
            `
            SELECT estado
            FROM cotizaciones
            WHERE id_cotizacion = ?
            LIMIT 1
            `,
            [idCotizacion]
        );

        return rows[0]?.estado ?? null;
    },
    update: async (idCotizacion, data, detalles = [], estadoEsperado = 'borrador') => {
        await asegurarColumnaMovilidad();
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [cabecera] = await connection.execute(
                `UPDATE cotizaciones
                 SET id_cliente = ?, tipo_pago = ?, centro_costo = ?, movilidad = ?, nota = ?
                 WHERE id_cotizacion = ? AND estado = ?`,
                [
                    data.idCliente,
                    data.tipoPago,
                    data.centroCosto,
                    normalizarCostoAdicional(data.movilidad),
                    data.nota?.trim() || null,
                    idCotizacion,
                    estadoEsperado
                ]
            );
            if (cabecera.affectedRows === 0) {
                const error = new Error('La cotización cambió de estado y ya no está disponible para esta edición');
                error.statusCode = 409;
                throw error;
            }

            await connection.execute(
                'DELETE FROM cotizacion_detalles WHERE id_cotizacion = ?',
                [idCotizacion]
            );
            const sqlDetalle = `INSERT INTO cotizacion_detalles
                (id_cotizacion, id_equipo, id_subtipo_servicio, precio)
                VALUES (?, ?, ?, ?)`;
            for (const detalle of detalles) {
                const subtipos = Array.isArray(detalle.idServicios)
                    ? detalle.idServicios
                    : [];
                if (subtipos.length === 0) {
                    const error = new Error('Cada detalle debe tener al menos un servicio');
                    error.statusCode = 400;
                    throw error;
                }
                for (const servicio of subtipos) {
                    const { idSubtipoServicio, precio } = normalizarServicioCotizado(servicio);
                    await connection.execute(sqlDetalle, [
                        idCotizacion,
                        detalle.idEquipo || null,
                        idSubtipoServicio,
                        precio
                    ]);
                }
            }
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },
    updateEstado: async (idCotizacion, estado, estadoActual) => {
        const [result] = await db.execute(
            `
            UPDATE cotizaciones
            SET estado = ?,
                fecha_actualizacion_estado = NOW()
            WHERE id_cotizacion = ?
              AND estado = ?
            `,
            [estado, idCotizacion, estadoActual]
        );

        return result.affectedRows > 0;
    },
    getAll: async (idUsuarioCreador = null) => {
        await asegurarColumnaMovilidad();
        const filtrarPorCreador = Number.isInteger(idUsuarioCreador)
            && idUsuarioCreador > 0;
        const sql = `
        SELECT
            c.id_cotizacion,
            c.numero_cotizacion,
            c.id_cliente,
            c.tipo_pago,
            c.centro_costo,
            c.movilidad,
            c.fecha_registro,
            c.fecha_actualizacion_estado,
            c.nota,
            c.estado,
            c.id_usuario_creador,
            cl.razon_social AS nombre_cliente,
            cl.ruc,
            cl.correo,
            cl.direccion,
            cl.celular,
            cl.contacto,
            cl.distrito,
            cl.provincia,
            cl.departamento,
            cl.zona
        FROM cotizaciones c
        LEFT JOIN clientes cl
            ON cl.id_cliente = c.id_cliente
        ${filtrarPorCreador ? 'WHERE c.id_usuario_creador = ?' : ''}
        ORDER BY
            c.fecha_registro DESC,
            c.id_cotizacion DESC
    `;

        const parametros = filtrarPorCreador ? [idUsuarioCreador] : [];
        const [rows] = await db.execute(sql, parametros);

        return rows;
    },

    /**
     * Obtiene una cotización con sus equipos
     * y los servicios agrupados por equipo.
     */
    getById: async (id) => {
        await asegurarColumnaMovilidad();
        const sqlCabecera = `
        SELECT
            c.id_cotizacion,
            c.numero_cotizacion,
            c.id_cliente,
            c.tipo_pago,
            c.centro_costo,
            c.movilidad,
            c.fecha_registro,
            c.fecha_actualizacion_estado,
            c.nota,
            c.estado,
            c.id_usuario_creador,
            cl.razon_social AS nombre_cliente,
            cl.ruc,
            cl.correo,
            cl.direccion,
            cl.celular,
            cl.contacto,
            cl.distrito,
            cl.provincia,
            cl.departamento,
            cl.zona
        FROM cotizaciones c
        LEFT JOIN clientes cl
            ON cl.id_cliente = c.id_cliente
        WHERE c.id_cotizacion = ?
        LIMIT 1
    `;

        const [cabeceras] = await db.execute(sqlCabecera, [id]);

        if (cabeceras.length === 0) {
            return null;
        }

        const sqlDetalles = `
        SELECT
            cd.id_detalle,
            cd.id_cotizacion,
            cd.id_equipo,
            cd.id_subtipo_servicio,
            cd.precio,

            e.tipo_equipo,
            e.modelo,
            e.serie,
            e.sede,
            e.codigo_interno,
            e.encargado_equipo,

            m.id_marca,
            m.nombre AS nombre_marca,

            sts.id_tipo_servicio,
            sts.codigo AS codigo_subtipo,
            sts.nombre AS nombre_subtipo,

            ts.codigo AS codigo_tipo_servicio,
            ts.nombre AS nombre_tipo_servicio

        FROM cotizacion_detalles cd

        LEFT JOIN equipos e
            ON e.id_equipo = cd.id_equipo

        LEFT JOIN marcas m
            ON m.id_marca = e.id_marca

        LEFT JOIN subtipo_servicio sts
            ON sts.id_subtipo_servicio = cd.id_subtipo_servicio

        LEFT JOIN tipo_servicio ts
            ON ts.id_tipo_servicio = sts.id_tipo_servicio

        WHERE cd.id_cotizacion = ?

        ORDER BY
            cd.id_equipo ASC,
            cd.id_detalle ASC
    `;

        const [detalles] = await db.execute(sqlDetalles, [id]);

        const equiposMap = new Map();

        for (const detalle of detalles) {
            const claveEquipo = detalle.id_equipo ?? 'sin-equipo';

            if (!equiposMap.has(claveEquipo)) {
                equiposMap.set(claveEquipo, {
                    id_equipo: detalle.id_equipo,
                    sin_equipo: !detalle.id_equipo,
                    tipo_equipo: detalle.tipo_equipo,
                    marca: detalle.nombre_marca,
                    id_marca: detalle.id_marca,
                    modelo: detalle.modelo,
                    serie: detalle.serie,
                    sede: detalle.sede,
                    codigo_interno: detalle.codigo_interno,
                    encargado_equipo: detalle.encargado_equipo,
                    servicios: []
                });
            }

            if (detalle.id_subtipo_servicio) {
                equiposMap.get(claveEquipo).servicios.push({
                    id_detalle: detalle.id_detalle,
                    id_tipo_servicio: detalle.id_tipo_servicio,
                    codigo_tipo_servicio: detalle.codigo_tipo_servicio,
                    nombre_tipo_servicio: detalle.nombre_tipo_servicio,
                    id_subtipo_servicio: detalle.id_subtipo_servicio,
                    codigo_subtipo: detalle.codigo_subtipo,
                    nombre_subtipo: detalle.nombre_subtipo,
                    precio: detalle.precio
                });
            }
        }

        return {
            ...cabeceras[0],
            equipos: Array.from(equiposMap.values())
        };
    },
};

export default Cotizacion;
