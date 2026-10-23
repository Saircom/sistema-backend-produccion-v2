// src/modules/informes/informetecnico.model.js

import db from '../../config/db.js';

const informetecnicoModel = {

    /**
     * Lista todos los informes técnicos
     */
    getAll: async (rol) => {

        const soloRevisados = String(rol ?? '').trim().toUpperCase() === 'POSTVENTA';

        const sql = `
            SELECT
                i.id_informe,
                ot.id_ot,
                c.id_cliente,
                c.razon_social,

                od.id_ot_detalle,
                e.id_equipo,

                m.nombre AS marca,
                e.modelo,
                e.serie,
                e.tipo_equipo,
                e.codigo_interno,

                CONCAT(
                    COALESCE(m.nombre,'SIN MARCA'),
                    ' ',
                    COALESCE(e.modelo,'SIN MODELO'),
                    ' (',
                    COALESCE(e.serie,'SIN SERIE'),
                    ')'
                ) AS equipo,

                GROUP_CONCAT(
                    DISTINCT CONCAT(
                        ts.nombre,
                        ' - ',
                        ss.nombre
                    )
                    ORDER BY ts.nombre, ss.nombre
                    SEPARATOR ', '
                ) AS servicios,

                ot.fecha_programada,
                od.estado_equipo,
                i.fecha_finalizacion,
                i.estado_revision

            FROM informes_servicio i

            INNER JOIN ot_detalles od
                ON od.id_ot_detalle = i.id_ot_detalle

            INNER JOIN ordenes_trabajo ot
                ON ot.id_ot = od.id_ot

            INNER JOIN cotizaciones ct
                ON ct.id_cotizacion = ot.id_cotizacion

            INNER JOIN clientes c
                ON c.id_cliente = ct.id_cliente

            INNER JOIN equipos e
                ON e.id_equipo = od.id_equipo

            LEFT JOIN marcas m
                ON m.id_marca = e.id_marca

            LEFT JOIN ot_detalle_servicios ods
                ON ods.id_ot_detalle = od.id_ot_detalle

            LEFT JOIN subtipo_servicio ss
                ON ss.id_subtipo_servicio = ods.id_subtipo_servicio

            LEFT JOIN tipo_servicio ts
                ON ts.id_tipo_servicio = ss.id_tipo_servicio

            WHERE i.fecha_finalizacion IS NOT NULL
              ${soloRevisados ? "AND i.estado_revision = 'Revisado'" : ''}

            GROUP BY
                i.id_informe,
                ot.id_ot,
                c.id_cliente,
                c.razon_social,
                od.id_ot_detalle,
                e.id_equipo,
                m.nombre,
                e.modelo,
                e.serie,
                e.tipo_equipo,
                e.codigo_interno,
                ot.fecha_programada,
                od.estado_equipo,
                i.fecha_finalizacion,
                i.estado_revision

            ORDER BY i.id_informe DESC;
        `;

        const [rows] = await db.query(sql);

        return rows;
    },

    updateEstadoRevision: async (idInforme, estadoRevision) => {
        const [result] = await db.execute(
            `UPDATE informes_servicio
             SET estado_revision = ?
             WHERE id_informe = ?
               AND fecha_finalizacion IS NOT NULL`,
            [estadoRevision, idInforme]
        );
        return result.affectedRows > 0;
    }

};

export default informetecnicoModel; 
