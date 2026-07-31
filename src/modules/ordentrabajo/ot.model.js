import db from '../../config/db.js';

export const otModel = {
    async getAll() {
        const sql = `
            SELECT
                c.id_cotizacion,
                c.numero_cotizacion,
                c.fecha_registro,
                c.tipo_pago,
                c.centro_costo,
                c.nota,
                c.estado,
                c.id_usuario_creador,
                CONCAT_WS(' ', uc.nombres, uc.apellidos) AS creado_por,
                cl.id_cliente,
                cl.razon_social,
                cl.ruc,
                cl.direccion,
                cl.celular,
                cl.contacto,
                COUNT(DISTINCT cd.id_equipo) AS total_equipos,
                COUNT(cd.id_detalle) AS total_servicios

            FROM cotizaciones c

            INNER JOIN clientes cl
                ON cl.id_cliente = c.id_cliente

            LEFT JOIN usuarios uc
                ON uc.id_usuario = c.id_usuario_creador

            INNER JOIN cotizacion_detalles cd
                ON cd.id_cotizacion = c.id_cotizacion

            LEFT JOIN ordenes_trabajo ot
                ON ot.id_cotizacion = c.id_cotizacion

            WHERE
                c.estado = 'aprobada'
                AND ot.id_ot IS NULL

            GROUP BY
                c.id_cotizacion,
                c.numero_cotizacion,
                c.fecha_registro,
                c.tipo_pago,
                c.centro_costo,
                c.nota,
                c.estado,
                c.id_usuario_creador,
                uc.nombres,
                uc.apellidos,
                cl.id_cliente,
                cl.razon_social,
                cl.ruc,
                cl.direccion,
                cl.celular,
                cl.contacto

            ORDER BY
                c.fecha_registro DESC,
                c.id_cotizacion DESC
        `;

        const [rows] = await db.execute(sql);

        return rows;
    },

    /**
     * Obtiene una cotización aprobada con sus equipos
     * y los servicios agrupados por equipo.
     */
    async getCotizacionById(idCotizacion) {
        const sqlCabecera = `
            SELECT
                c.id_cotizacion,
                c.numero_cotizacion,
                c.fecha_registro,
                c.tipo_pago,
                c.centro_costo,
                c.nota,
                c.estado,
                cl.id_cliente,
                cl.razon_social,
                cl.ruc,
                cl.direccion,
                cl.celular,
                cl.contacto,
                cl.distrito,
                cl.provincia,
                cl.departamento

            FROM cotizaciones c

            INNER JOIN clientes cl
                ON cl.id_cliente = c.id_cliente

            WHERE c.id_cotizacion = ?

            LIMIT 1
        `;

        const [cabeceras] = await db.execute(sqlCabecera, [
            idCotizacion
        ]);

        if (cabeceras.length === 0) {
            return null;
        }

        const sqlDetalles = `
            SELECT
                cd.id_detalle,
                cd.id_equipo,
                cd.id_subtipo_servicio,
                e.tipo_equipo,
                e.sede,
                e.direccion AS direccion_equipo,
                e.modelo,
                e.serie,
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
                ON sts.id_subtipo_servicio =
                   cd.id_subtipo_servicio

            LEFT JOIN tipo_servicio ts
                ON ts.id_tipo_servicio =
                   sts.id_tipo_servicio

            WHERE cd.id_cotizacion = ?

            ORDER BY
                cd.id_equipo ASC,
                cd.id_detalle ASC
        `;

        const [detalles] = await db.execute(sqlDetalles, [
            idCotizacion
        ]);

        const equiposMap = new Map();

        for (const detalle of detalles) {
            if (!equiposMap.has(detalle.id_equipo)) {
                equiposMap.set(detalle.id_equipo, {
                    id_equipo: detalle.id_equipo,
                    tipo_equipo: detalle.tipo_equipo,
                    id_marca: detalle.id_marca,
                    marca: detalle.nombre_marca,
                    modelo: detalle.modelo,
                    serie: detalle.serie,
                    sede: detalle.sede,
                    direccion: detalle.direccion_equipo,
                    codigo_interno: detalle.codigo_interno,
                    encargado_equipo:
                        detalle.encargado_equipo,
                    servicios: []
                });
            }

            if (detalle.id_subtipo_servicio) {
                equiposMap
                    .get(detalle.id_equipo)
                    .servicios.push({
                        id_detalle:
                            detalle.id_detalle,
                        id_tipo_servicio:
                            detalle.id_tipo_servicio,
                        codigo_tipo_servicio:
                            detalle.codigo_tipo_servicio,
                        nombre_tipo_servicio:
                            detalle.nombre_tipo_servicio,
                        id_subtipo_servicio:
                            detalle.id_subtipo_servicio,
                        codigo_subtipo:
                            detalle.codigo_subtipo,
                        nombre_subtipo:
                            detalle.nombre_subtipo
                    });
            }
        }

        return {
            ...cabeceras[0],
            equipos: Array.from(equiposMap.values())
        };
    },

    /**
     * Genera una Orden de Trabajo desde una cotización.
     *
     * Crea:
     * 1. Cabecera de OT.
     * 2. Un ot_detalle por equipo.
     * 3. Los servicios de cada equipo.
     * 4. Un registro de tiempos por equipo.
     */
    async createFromCotizacion(data) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const {
                idCotizacion,
                idTecnicoResponsable,
                idMovilidad,
                fechaProgramada,
                fechaFinProgramada,
                idUsuarioCreador,
                idsTecnicosApoyo = []
            } = data;

            /*
             * 1. Obtener y bloquear la cotización.
             */
            const [cotizaciones] =
                await connection.execute(
                    `
                    SELECT
                        id_cotizacion,
                        numero_cotizacion,
                        id_cliente,
                        estado
                    FROM cotizaciones
                    WHERE id_cotizacion = ?
                    FOR UPDATE
                    `,
                    [idCotizacion]
                );

            if (cotizaciones.length === 0) {
                throw new Error(
                    'La cotización no existe'
                );
            }

            const cotizacion = cotizaciones[0];

            if (cotizacion.estado !== 'aprobada') {
                throw new Error(
                    'Solo se puede generar una OT desde una cotización aprobada'
                );
            }

            /*
             * 2. Evitar más de una OT para la misma cotización.
             */
            const [ordenExistente] =
                await connection.execute(
                    `
                    SELECT id_ot
                    FROM ordenes_trabajo
                    WHERE id_cotizacion = ?
                    LIMIT 1
                    `,
                    [idCotizacion]
                );

            if (ordenExistente.length > 0) {
                throw new Error(
                    'La cotización ya tiene una Orden de Trabajo creada'
                );
            }

            /*
             * 3. Validar técnico.
             */
            const [tecnicos] =
                await connection.execute(
                    `
                    SELECT u.id_usuario
                    FROM usuarios u
                    INNER JOIN roles r ON r.id_rol = u.id_rol
                    WHERE u.id_usuario = ?
                      AND u.estado = 1
                      AND UPPER(TRIM(r.nombre_rol)) = 'TECNICO'
                    LIMIT 1
                    `,
                    [idTecnicoResponsable]
                );

            if (tecnicos.length === 0) {
                throw new Error(
                    'El técnico seleccionado no existe o está inactivo'
                );
            }

            if (idsTecnicosApoyo.length > 0) {
                const placeholders = idsTecnicosApoyo.map(() => '?').join(', ');
                const [tecnicosApoyoValidos] = await connection.execute(
                    `SELECT u.id_usuario FROM usuarios u
                     INNER JOIN roles r ON r.id_rol = u.id_rol
                     WHERE u.id_usuario IN (${placeholders})
                       AND u.estado = 1
                       AND UPPER(TRIM(r.nombre_rol)) = 'TECNICO'`,
                    idsTecnicosApoyo
                );
                if (tecnicosApoyoValidos.length !== idsTecnicosApoyo.length) {
                    throw new Error('Uno o más técnicos de apoyo no existen o están inactivos');
                }
            }

            /*
             * 4. Validar movilidad.
             */
            const [movilidades] =
                await connection.execute(
                    `
                    SELECT
                        id_movilidad,
                        estado_disponibilidad
                    FROM movilidades
                    WHERE id_movilidad = ?
                    LIMIT 1
                    FOR UPDATE
                    `,
                    [idMovilidad]
                );

            if (movilidades.length === 0) {
                throw new Error(
                    'La movilidad seleccionada no existe'
                );
            }

            if (movilidades[0].estado_disponibilidad === 'En mantenimiento') {
                throw new Error(
                    'La movilidad seleccionada no está disponible'
                );
            }

            /*
             * 5. Obtener los equipos y subtipos.
             */
            const [detallesCotizacion] =
                await connection.execute(
                    `
                    SELECT
                        cd.id_equipo,
                        cd.id_subtipo_servicio
                    FROM cotizacion_detalles cd
                    WHERE cd.id_cotizacion = ?
                      AND cd.id_subtipo_servicio IS NOT NULL
                    ORDER BY
                        cd.id_equipo ASC,
                        cd.id_detalle ASC
                    `,
                    [idCotizacion]
                );

            if (detallesCotizacion.length === 0) {
                throw new Error(
                    'La cotización no contiene servicios válidos'
                );
            }

            /*
             * 6. Crear la cabecera global.
             */
            const [resultadoOt] =
                await connection.execute(
                    `
                    INSERT INTO ordenes_trabajo (
                        id_cotizacion,
                        id_tecnico_responsable,
                        id_movilidad,
                        fecha_programada,
                        fecha_fin_programada,
                        estado,
                        id_usuario_creador
                    )
                    VALUES (?, ?, ?, ?, ?, 'Programada', ?)
                    `,
                    [
                        idCotizacion,
                        idTecnicoResponsable,
                        idMovilidad,
                        fechaProgramada,
                        fechaFinProgramada,
                        idUsuarioCreador
                    ]
                );

            const idOt = resultadoOt.insertId;

            const tecnicosAsignados = [idTecnicoResponsable, ...idsTecnicosApoyo];
            for (const idUsuario of tecnicosAsignados) {
                await connection.execute(
                    `INSERT INTO asignaciones_tecnicos (id_ot, id_usuario)
                     VALUES (?, ?)`,
                    [idOt, idUsuario]
                );
            }

            /*
             * 7. Agrupar servicios por equipo.
             */
            const equiposMap = new Map();

            for (const detalle of detallesCotizacion) {
                if (!equiposMap.has(detalle.id_equipo)) {
                    equiposMap.set(
                        detalle.id_equipo,
                        new Set()
                    );
                }

                equiposMap
                    .get(detalle.id_equipo)
                    .add(detalle.id_subtipo_servicio);
            }

            const detallesCreados = [];

            /*
             * 8. Crear un detalle por equipo.
             */
            for (
                const [idEquipo, subtiposSet]
                of equiposMap.entries()
            ) {
                const [resultadoDetalle] =
                    await connection.execute(
                        `
                        INSERT INTO ot_detalles (
                            id_ot,
                            id_equipo,
                            estado_equipo
                        )
                        VALUES (?, ?, 'Pendiente')
                        `,
                        [idOt, idEquipo]
                    );

                const idOtDetalle =
                    resultadoDetalle.insertId;

                const subtipos =
                    Array.from(subtiposSet);

                /*
                 * 9. Copiar servicios cotizados.
                 */
                for (
                    const idSubtipoServicio of subtipos
                ) {
                    await connection.execute(
                        `
                        INSERT INTO ot_detalle_servicios (
                            id_ot_detalle,
                            id_subtipo_servicio,
                            estado
                        )
                        VALUES (?, ?, 'Pendiente')
                        `,
                        [
                            idOtDetalle,
                            idSubtipoServicio
                        ]
                    );
                }

                /*
                 * 10. Crear el registro de tiempos.
                 */
                await connection.execute(
                    `
                    INSERT INTO servicio_tiempos (
                        id_ot_detalle,
                        fecha_hora_llegada,
                        fecha_hora_inicio,
                        fecha_hora_fin
                    )
                    VALUES (?, NULL, NULL, NULL)
                    `,
                    [idOtDetalle]
                );

                detallesCreados.push({
                    id_ot_detalle: idOtDetalle,
                    id_equipo: idEquipo,
                    servicios:
                        subtipos.map(
                            idSubtipoServicio => ({
                                id_subtipo_servicio:
                                    idSubtipoServicio
                            })
                        )
                });
            }

            /*
             * 11. Marcar movilidad como asignada.
             */
            await connection.execute(
                `
    UPDATE movilidades
    SET estado_disponibilidad = 'En uso'
    WHERE id_movilidad = ?
    `,
                [idMovilidad]
            );
            await connection.commit();

            return {
                id_ot: idOt,
                id_cotizacion: idCotizacion,
                id_tecnico_responsable:
                    idTecnicoResponsable,
                tecnicos_asignados: tecnicosAsignados,
                id_movilidad: idMovilidad,
                fecha_programada: fechaProgramada,
                fecha_fin_programada: fechaFinProgramada,
                estado: 'Programada',
                detalles: detallesCreados
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Lista todas las Órdenes de Trabajo creadas.
     */
    async getOrdenes() {
        const sql = `
            SELECT
                ot.id_ot,
                ot.id_cotizacion,
                ot.fecha_programada,
                ot.fecha_fin_programada,
                ot.estado,
                ot.id_tecnico_responsable,
                ot.id_movilidad,
                ot.id_usuario_creador,

                c.numero_cotizacion,

                cl.id_cliente,
                cl.razon_social,
                cl.ruc,

                CONCAT(
                    tecnico.nombres,
                    ' ',
                    tecnico.apellidos
                ) AS tecnico_responsable,

                CONCAT(
                    creador.nombres,
                    ' ',
                    creador.apellidos
                ) AS usuario_creador,

                m.placa AS movilidad,

                COUNT(DISTINCT od.id_equipo)
                    AS total_equipos,

                SUM(
                    CASE
                        WHEN od.estado_equipo =
                             'Finalizado'
                        THEN 1
                        ELSE 0
                    END
                ) AS equipos_finalizados

            FROM ordenes_trabajo ot

            INNER JOIN cotizaciones c
                ON c.id_cotizacion =
                   ot.id_cotizacion

            INNER JOIN clientes cl
                ON cl.id_cliente =
                   c.id_cliente

            INNER JOIN usuarios tecnico
                ON tecnico.id_usuario =
                   ot.id_tecnico_responsable

            LEFT JOIN usuarios creador
                ON creador.id_usuario =
                   ot.id_usuario_creador

            INNER JOIN movilidades m
                ON m.id_movilidad =
                   ot.id_movilidad

            LEFT JOIN ot_detalles od
                ON od.id_ot = ot.id_ot

            GROUP BY
                ot.id_ot,
                ot.id_cotizacion,
                ot.fecha_programada,
                ot.fecha_fin_programada,
                ot.estado,
                ot.id_tecnico_responsable,
                ot.id_movilidad,
                ot.id_usuario_creador,
                c.numero_cotizacion,
                cl.id_cliente,
                cl.razon_social,
                cl.ruc,
                tecnico.nombres,
                tecnico.apellidos,
                creador.nombres,
                creador.apellidos,
                m.placa

            ORDER BY
                ot.id_ot DESC
        `;

        const [rows] = await db.execute(sql);

        return rows;
    },

    /**
     * Obtiene una OT completa con equipos,
     * servicios y tiempos.
     */
    async getOrdenById(idOt) {
        const sqlCabecera = `
            SELECT
                ot.id_ot,
                ot.id_cotizacion,
                ot.id_tecnico_responsable,
                ot.id_movilidad,
                ot.fecha_programada,
                ot.fecha_fin_programada,
                ot.estado,
                ot.id_usuario_creador,

                c.numero_cotizacion,
                c.tipo_pago,
                c.centro_costo,
                c.nota,

                cl.id_cliente,
                cl.razon_social,
                cl.ruc,
                cl.direccion,
                cl.contacto,
                cl.celular,

                CONCAT(
                    tecnico.nombres,
                    ' ',
                    tecnico.apellidos
                ) AS tecnico_responsable,

                m.placa AS placa_movilidad,
                m.marca AS marca_movilidad,
                m.modelo AS modelo_movilidad

            FROM ordenes_trabajo ot

            INNER JOIN cotizaciones c
                ON c.id_cotizacion =
                   ot.id_cotizacion

            INNER JOIN clientes cl
                ON cl.id_cliente =
                   c.id_cliente

            INNER JOIN usuarios tecnico
                ON tecnico.id_usuario =
                   ot.id_tecnico_responsable

            INNER JOIN movilidades m
                ON m.id_movilidad =
                   ot.id_movilidad

            WHERE ot.id_ot = ?

            LIMIT 1
        `;

        const [cabeceras] = await db.execute(
            sqlCabecera,
            [idOt]
        );

        if (cabeceras.length === 0) {
            return null;
        }

        const sqlDetalles = `
            SELECT
                od.id_ot_detalle,
                od.id_equipo,
                od.estado_equipo,
                inf.id_informe,

                e.tipo_equipo,
                e.sede,
                e.direccion,
                e.modelo,
                e.serie,
                e.codigo_interno,
                e.encargado_equipo,

                ma.nombre AS marca,

                st.fecha_hora_llegada,
                st.fecha_hora_inicio,
                st.fecha_hora_fin,

                ods.id_ot_detalle_servicio,
                ods.id_subtipo_servicio,
                ods.estado AS estado_servicio,
                ods.observacion,

                sts.codigo AS codigo_subtipo,
                sts.nombre AS nombre_subtipo,

                ts.id_tipo_servicio,
                ts.codigo AS codigo_tipo_servicio,
                ts.nombre AS nombre_tipo_servicio

            FROM ot_detalles od

            LEFT JOIN equipos e
                ON e.id_equipo =
                   od.id_equipo

            LEFT JOIN marcas ma
                ON ma.id_marca =
                   e.id_marca

            LEFT JOIN informes_servicio inf
                ON inf.id_ot_detalle =
                   od.id_ot_detalle

            LEFT JOIN servicio_tiempos st
                ON st.id_ot_detalle =
                   od.id_ot_detalle

            LEFT JOIN ot_detalle_servicios ods
                ON ods.id_ot_detalle =
                   od.id_ot_detalle

            LEFT JOIN subtipo_servicio sts
                ON sts.id_subtipo_servicio =
                   ods.id_subtipo_servicio

            LEFT JOIN tipo_servicio ts
                ON ts.id_tipo_servicio =
                   sts.id_tipo_servicio

            WHERE od.id_ot = ?

            ORDER BY
                od.id_ot_detalle ASC,
                ods.id_ot_detalle_servicio ASC
        `;

        const [rows] = await db.execute(
            sqlDetalles,
            [idOt]
        );

        const equiposMap = new Map();

        for (const row of rows) {
            if (
                !equiposMap.has(
                    row.id_ot_detalle
                )
            ) {
                equiposMap.set(
                    row.id_ot_detalle,
                    {
                        id_ot_detalle:
                            row.id_ot_detalle,
                        id_informe:
                            row.id_informe,
                        id_equipo:
                            row.id_equipo,
                        estado_equipo:
                            row.estado_equipo,
                        tipo_equipo:
                            row.tipo_equipo,
                        marca:
                            row.marca,
                        modelo:
                            row.modelo,
                        serie:
                            row.serie,
                        sede:
                            row.sede,
                        direccion:
                            row.direccion,
                        codigo_interno:
                            row.codigo_interno,
                        encargado_equipo:
                            row.encargado_equipo,

                        tiempos: {
                            fecha_hora_programada:
                                row.fecha_hora_programada,
                            fecha_hora_llegada:
                                row.fecha_hora_llegada,
                            fecha_hora_inicio:
                                row.fecha_hora_inicio,
                            fecha_hora_fin:
                                row.fecha_hora_fin
                        },

                        servicios: []
                    }
                );
            }

            if (row.id_subtipo_servicio) {
                equiposMap
                    .get(row.id_ot_detalle)
                    .servicios.push({
                        id_ot_detalle_servicio:
                            row.id_ot_detalle_servicio,
                        id_tipo_servicio:
                            row.id_tipo_servicio,
                        codigo_tipo_servicio:
                            row.codigo_tipo_servicio,
                        nombre_tipo_servicio:
                            row.nombre_tipo_servicio,
                        id_subtipo_servicio:
                            row.id_subtipo_servicio,
                        codigo_subtipo:
                            row.codigo_subtipo,
                        nombre_subtipo:
                            row.nombre_subtipo,
                        estado:
                            row.estado_servicio,
                        observacion:
                            row.observacion
                    });
            }
        }

        const [tecnicosAsignados] = await db.execute(
            `SELECT
                at.id_asignacion,
                u.id_usuario,
                u.nombres,
                u.apellidos,
                CASE
                    WHEN u.id_usuario = ? THEN 'Líder'
                    ELSE 'Apoyo'
                END AS tipo_asignacion
             FROM asignaciones_tecnicos at
             INNER JOIN usuarios u ON u.id_usuario = at.id_usuario
             WHERE at.id_ot = ?
             ORDER BY
                CASE WHEN u.id_usuario = ? THEN 0 ELSE 1 END,
                u.nombres,
                u.apellidos`,
            [
                cabeceras[0].id_tecnico_responsable,
                idOt,
                cabeceras[0].id_tecnico_responsable
            ]
        );

        return {
            ...cabeceras[0],
            tecnicos_asignados: tecnicosAsignados,
            tecnicos_adicionales: tecnicosAsignados.filter(
                tecnico => tecnico.tipo_asignacion === 'Apoyo'
            ),
            equipos:
                Array.from(equiposMap.values())
        };
    },

    /**
     * Actualiza el estado global de una OT.
     */
    async updateEstado(idOt, estado) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [ordenes] = await connection.execute(
                `
                SELECT id_ot, id_movilidad
                FROM ordenes_trabajo
                WHERE id_ot = ?
                LIMIT 1
                FOR UPDATE
                `,
                [idOt]
            );

            if (ordenes.length === 0) {
                await connection.rollback();
                return false;
            }

            const orden = ordenes[0];

            if (estado === 'Finalizada') {
                const [pendientes] = await connection.execute(
                    `
                    SELECT COUNT(*) AS total
                    FROM ot_detalles od
                    LEFT JOIN informes_servicio inf
                        ON inf.id_ot_detalle = od.id_ot_detalle
                    WHERE od.id_ot = ?
                      AND EXISTS (
                          SELECT 1
                          FROM ot_detalle_servicios ods_requerido
                          INNER JOIN subtipo_servicio ss_requerido
                              ON ss_requerido.id_subtipo_servicio =
                                 ods_requerido.id_subtipo_servicio
                          INNER JOIN tipo_servicio ts_requerido
                              ON ts_requerido.id_tipo_servicio =
                                 ss_requerido.id_tipo_servicio
                          WHERE ods_requerido.id_ot_detalle = od.id_ot_detalle
                            AND UPPER(TRIM(ts_requerido.codigo)) <>
                                'ACTIVIDAD_DE_APOYO'
                      )
                      AND (
                          inf.id_informe IS NULL
                          OR inf.fecha_finalizacion IS NULL
                      )
                    `,
                    [idOt]
                );

                if (Number(pendientes[0]?.total ?? 0) > 0) {
                    throw new Error(
                        'No se puede finalizar la OT porque existen informes técnicos pendientes'
                    );
                }
            }

            await connection.execute(
                `
                UPDATE ordenes_trabajo
                SET estado = ?
                WHERE id_ot = ?
                `,
                [estado, idOt]
            );

            if (estado === 'Finalizada' && orden.id_movilidad) {
                await connection.execute(
                    `
                    UPDATE movilidades
                    SET estado_disponibilidad = 'Disponible'
                    WHERE id_movilidad = ?
                      AND NOT EXISTS (
                          SELECT 1
                          FROM ordenes_trabajo otra_ot
                          WHERE otra_ot.id_movilidad = movilidades.id_movilidad
                            AND otra_ot.id_ot <> ?
                            AND otra_ot.estado <> 'Finalizada'
                      )
                    `,
                    [orden.id_movilidad, idOt]
                );
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

    /**
     * Actualiza el estado de un equipo dentro de la OT.
     */
    async updateEstadoEquipo(
        idOtDetalle,
        estadoEquipo
    ) {
        const sql = `
            UPDATE ot_detalles
            SET estado_equipo = ?
            WHERE id_ot_detalle = ?
        `;

        const [result] = await db.execute(sql, [
            estadoEquipo,
            idOtDetalle
        ]);

        return result.affectedRows > 0;
    },

    /**
     * Actualiza los tiempos de un equipo.
     */
    async updateTiempos(idOtDetalle, data) {
        const {
            fechaHoraLlegada = null,
            fechaHoraInicio = null,
            fechaHoraFin = null
        } = data;

        const sql = `
            UPDATE servicio_tiempos
            SET
                fecha_hora_llegada =
                    COALESCE(
                        ?,
                        fecha_hora_llegada
                    ),
                fecha_hora_inicio =
                    COALESCE(
                        ?,
                        fecha_hora_inicio
                    ),
                fecha_hora_fin =
                    COALESCE(
                        ?,
                        fecha_hora_fin
                    )
            WHERE id_ot_detalle = ?
        `;

        const [result] = await db.execute(sql, [
            fechaHoraLlegada,
            fechaHoraInicio,
            fechaHoraFin,
            idOtDetalle
        ]);

        return result.affectedRows > 0;
    },

    /**
     * Elimina una OT únicamente si sigue programada
     * y ningún equipo ha comenzado.
     */
    async delete(idOt) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [ordenes] =
                await connection.execute(
                    `
                    SELECT
                        id_ot,
                        id_movilidad,
                        estado
                    FROM ordenes_trabajo
                    WHERE id_ot = ?
                    FOR UPDATE
                    `,
                    [idOt]
                );

            if (ordenes.length === 0) {
                throw new Error(
                    'La Orden de Trabajo no existe'
                );
            }

            const orden = ordenes[0];

            if (orden.estado !== 'Programada') {
                throw new Error(
                    'Solo se puede eliminar una OT programada'
                );
            }

            const [detallesIniciados] =
                await connection.execute(
                    `
                    SELECT id_ot_detalle
                    FROM ot_detalles
                    WHERE id_ot = ?
                      AND estado_equipo <>
                          'Pendiente'
                    LIMIT 1
                    `,
                    [idOt]
                );

            if (detallesIniciados.length > 0) {
                throw new Error(
                    'La OT tiene equipos que ya iniciaron'
                );
            }

            /*
             * Los tiempos y servicios se eliminan
             * automáticamente si tienen ON DELETE CASCADE.
             */
            await connection.execute(
                `
                DELETE FROM ot_detalles
                WHERE id_ot = ?
                `,
                [idOt]
            );

            await connection.execute(
                `
                DELETE FROM ordenes_trabajo
                WHERE id_ot = ?
                `,
                [idOt]
            );

            await connection.execute(
                `
                UPDATE movilidades
                SET estado_disponibilidad = 'Disponible'
                WHERE id_movilidad = ?
                  AND NOT EXISTS (
                      SELECT 1
                      FROM ordenes_trabajo otra_ot
                      WHERE otra_ot.id_movilidad = movilidades.id_movilidad
                        AND otra_ot.estado <> 'Finalizada'
                  )
                `,
                [orden.id_movilidad]
            );

            await connection.commit();

            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};
