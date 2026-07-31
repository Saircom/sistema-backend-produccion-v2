import db from '../../config/db.js';

export const tecnicoOTModel = {
    /**
     * Obtiene las órdenes asignadas a un técnico.
     */
    async getOrdenesByTecnico(idTecnico) {
        const sql = `
            SELECT
                ot.id_ot,
                ot.id_cotizacion,
                ot.id_tecnico_responsable,
                ot.id_movilidad,
                ot.fecha_programada,
                ot.estado,
                ot.id_usuario_creador,

                c.numero_cotizacion,
                c.tipo_pago,
                c.centro_costo,

                cl.id_cliente,
                cl.razon_social,
                cl.ruc,
                cl.direccion,
                cl.contacto,
                cl.celular,

                m.placa AS placa_movilidad,
                m.marca AS marca_movilidad,
                m.modelo AS modelo_movilidad,

                COUNT(DISTINCT od.id_ot_detalle)
                    AS total_equipos,

                SUM(
                    CASE
                        WHEN od.estado_equipo = 'Finalizado'
                        THEN 1
                        ELSE 0
                    END
                ) AS equipos_finalizados

            FROM ordenes_trabajo ot

            INNER JOIN cotizaciones c
                ON c.id_cotizacion = ot.id_cotizacion

            INNER JOIN clientes cl
                ON cl.id_cliente = c.id_cliente

            LEFT JOIN movilidades m
                ON m.id_movilidad = ot.id_movilidad

            LEFT JOIN ot_detalles od
                ON od.id_ot = ot.id_ot

            WHERE ot.id_tecnico_responsable = ?
              AND ot.estado <> 'Finalizada'

            GROUP BY
                ot.id_ot,
                ot.id_cotizacion,
                ot.id_tecnico_responsable,
                ot.id_movilidad,
                ot.fecha_programada,
                ot.estado,
                ot.id_usuario_creador,

                c.numero_cotizacion,
                c.tipo_pago,
                c.centro_costo,

                cl.id_cliente,
                cl.razon_social,
                cl.ruc,
                cl.direccion,
                cl.contacto,
                cl.celular,

                m.placa,
                m.marca,
                m.modelo

            ORDER BY
                CASE ot.estado
                    WHEN 'En Proceso' THEN 1
                    WHEN 'Programada' THEN 2
                    ELSE 3
                END,
                ot.fecha_programada ASC,
                ot.id_ot DESC
        `;

        const [rows] = await db.execute(sql, [idTecnico]);

        return rows;
    },

    /**
     * Verifica que una OT pertenezca al técnico.
     */
    async verificarAsignacion(idOt, idTecnico) {
        const [rows] = await db.execute(
            `
            SELECT
                id_ot,
                id_tecnico_responsable
            FROM ordenes_trabajo
            WHERE id_ot = ?
              AND id_tecnico_responsable = ?
            LIMIT 1
            `,
            [idOt, idTecnico]
        );

        return rows[0] ?? null;
    },

    /**
     * Obtiene el detalle completo de una OT asignada.
     */
    async getOrdenById(idOt, idTecnico) {
        const asignacion = await this.verificarAsignacion(
            idOt,
            idTecnico
        );

        if (!asignacion) {
            return null;
        }

        const sqlCabecera = `
            SELECT
                ot.id_ot,
                ot.id_cotizacion,
                ot.id_tecnico_responsable,
                ot.id_movilidad,
                ot.fecha_programada,
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
                cl.distrito,
                cl.provincia,
                cl.departamento,

                CONCAT(
                    u.nombres,
                    ' ',
                    u.apellidos
                ) AS tecnico_responsable,

                m.placa AS placa_movilidad,
                m.marca AS marca_movilidad,
                m.modelo AS modelo_movilidad,
                m.tipo_vehiculo

            FROM ordenes_trabajo ot

            INNER JOIN cotizaciones c
                ON c.id_cotizacion = ot.id_cotizacion

            INNER JOIN clientes cl
                ON cl.id_cliente = c.id_cliente

            INNER JOIN usuarios u
                ON u.id_usuario =
                   ot.id_tecnico_responsable

            LEFT JOIN movilidades m
                ON m.id_movilidad = ot.id_movilidad

            WHERE ot.id_ot = ?
              AND ot.id_tecnico_responsable = ?

            LIMIT 1
        `;

        const [cabeceras] = await db.execute(
            sqlCabecera,
            [idOt, idTecnico]
        );

        if (cabeceras.length === 0) {
            return null;
        }

        const sqlDetalles = `
            SELECT
                od.id_ot_detalle,
                od.id_ot,
                od.id_equipo,
                od.estado_equipo,

                e.tipo_equipo,
                e.sede,
                e.direccion AS direccion_equipo,
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

                ss.codigo AS codigo_subtipo,
                ss.nombre AS nombre_subtipo,

                ts.id_tipo_servicio,
                ts.codigo AS codigo_tipo_servicio,
                ts.nombre AS nombre_tipo_servicio

            FROM ot_detalles od

            LEFT JOIN equipos e
                ON e.id_equipo = od.id_equipo

            LEFT JOIN marcas ma
                ON ma.id_marca = e.id_marca

            LEFT JOIN servicio_tiempos st
                ON st.id_ot_detalle = od.id_ot_detalle

            LEFT JOIN ot_detalle_servicios ods
                ON ods.id_ot_detalle = od.id_ot_detalle

            LEFT JOIN subtipo_servicio ss
                ON ss.id_subtipo_servicio =
                   ods.id_subtipo_servicio

            LEFT JOIN tipo_servicio ts
                ON ts.id_tipo_servicio =
                   ss.id_tipo_servicio

            WHERE od.id_ot = ?

            ORDER BY
                od.id_ot_detalle ASC,
                ods.id_ot_detalle_servicio ASC
        `;

        const [detalles] = await db.execute(
            sqlDetalles,
            [idOt]
        );

        const equiposMap = new Map();

        for (const fila of detalles) {
            if (!equiposMap.has(fila.id_ot_detalle)) {
                equiposMap.set(fila.id_ot_detalle, {
                    id_ot_detalle: fila.id_ot_detalle,
                    id_equipo: fila.id_equipo,
                    sin_equipo: !fila.id_equipo,
                    estado_equipo: fila.estado_equipo,

                    tipo_equipo: fila.tipo_equipo,
                    marca: fila.marca,
                    modelo: fila.modelo,
                    serie: fila.serie,
                    sede: fila.sede,
                    direccion: fila.direccion_equipo,
                    codigo_interno: fila.codigo_interno,
                    encargado_equipo:
                        fila.encargado_equipo,

                    tiempos: {
                        fecha_hora_llegada:
                            fila.fecha_hora_llegada,
                        fecha_hora_inicio:
                            fila.fecha_hora_inicio,
                        fecha_hora_fin:
                            fila.fecha_hora_fin
                    },

                    servicios: []
                });
            }

            if (fila.id_ot_detalle_servicio) {
                equiposMap
                    .get(fila.id_ot_detalle)
                    .servicios.push({
                        id_ot_detalle_servicio:
                            fila.id_ot_detalle_servicio,

                        id_tipo_servicio:
                            fila.id_tipo_servicio,

                        codigo_tipo_servicio:
                            fila.codigo_tipo_servicio,

                        nombre_tipo_servicio:
                            fila.nombre_tipo_servicio,

                        id_subtipo_servicio:
                            fila.id_subtipo_servicio,

                        codigo_subtipo:
                            fila.codigo_subtipo,

                        nombre_subtipo:
                            fila.nombre_subtipo,

                        estado:
                            fila.estado_servicio,

                        observacion:
                            fila.observacion
                    });
            }
        }

        return {
            ...cabeceras[0],
            equipos: Array.from(equiposMap.values())
        };
    },

    /**
     * Verifica que un detalle de OT pertenezca al técnico.
     */
    async verificarDetalleTecnico(
        idOtDetalle,
        idTecnico
    ) {
        const [rows] = await db.execute(
            `
            SELECT
                od.id_ot_detalle,
                od.id_ot,
                od.id_equipo,
                od.estado_equipo,
                ot.id_tecnico_responsable
            FROM ot_detalles od
            INNER JOIN ordenes_trabajo ot
                ON ot.id_ot = od.id_ot
            WHERE od.id_ot_detalle = ?
              AND ot.id_tecnico_responsable = ?
            LIMIT 1
            `,
            [idOtDetalle, idTecnico]
        );

        return rows[0] ?? null;
    },

    /**
     * Actualiza el estado de uno de los servicios
     * asignados a un equipo.
     */
    async updateEstadoServicio(
        idOtDetalleServicio,
        idTecnico,
        estado,
        observacion
    ) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [servicios] = await connection.execute(
                `
                SELECT
                    ods.id_ot_detalle_servicio,
                    ods.id_ot_detalle,
                    ot.id_tecnico_responsable
                FROM ot_detalle_servicios ods
                INNER JOIN ot_detalles od
                    ON od.id_ot_detalle =
                       ods.id_ot_detalle
                INNER JOIN ordenes_trabajo ot
                    ON ot.id_ot = od.id_ot
                WHERE ods.id_ot_detalle_servicio = ?
                  AND ot.id_tecnico_responsable = ?
                LIMIT 1
                FOR UPDATE
                `,
                [idOtDetalleServicio, idTecnico]
            );

            if (servicios.length === 0) {
                throw new Error(
                    'El servicio no existe o no pertenece al técnico'
                );
            }

            const [resultado] =
                await connection.execute(
                    `
                    UPDATE ot_detalle_servicios
                    SET
                        estado = ?,
                        observacion = ?
                    WHERE id_ot_detalle_servicio = ?
                    `,
                    [
                        estado,
                        observacion || null,
                        idOtDetalleServicio
                    ]
                );

            await connection.commit();

            return resultado.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    
};
