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
                i.estado_revision,
                COALESCE(i.estado_envio, 'sin_enviar') AS estado_envio,
                i.fecha_envio

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
                i.estado_revision,
                i.estado_envio,
                i.fecha_envio

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
    },

    updateEstadoEnvio: async (idInforme, estadoEnvio) => {
        const esEnviado = String(estadoEnvio).trim().toLowerCase() === 'enviado';
        const valor = esEnviado ? 'enviado' : 'sin_enviar';
        const [result] = await db.execute(
            `UPDATE informes_servicio
             SET estado_envio = ?,
                 fecha_envio = CASE WHEN ? = 'enviado' THEN NOW() ELSE NULL END
             WHERE id_informe = ?`,
            [valor, valor, idInforme]
        );
        return result.affectedRows > 0;
    },

    /**
     * Obtiene todos los campos consolidados para la exportación de Reporte de Servicios
     */
    getReporteServiciosExport: async ({ fechaDesde, fechaHasta } = {}) => {
        const whereClauses = [];
        const params = [];

        if (fechaDesde) {
            whereClauses.push('DATE(ot.fecha_programada) >= ?');
            params.push(fechaDesde);
        }
        if (fechaHasta) {
            whereClauses.push('DATE(ot.fecha_programada) <= ?');
            params.push(fechaHasta);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const sql = `
            SELECT
                ot.id_ot AS ot_numero,
                DATE_FORMAT(ot.fecha_programada, '%Y-%m-%d') AS fecha_programada,
                DATE_FORMAT(ot.fecha_programada, '%H:%i') AS hora_programada,
                CASE
                    WHEN c.nota LIKE '%taller%' OR e.sede LIKE '%taller%' OR cl.razon_social LIKE '%saircom%' THEN 'TALLER'
                    ELSE 'CAMPO'
                END AS taller_campo,
                cl.razon_social AS cliente,
                COALESCE(c.centro_costo, 'No registrado') AS centro_costo,
                COALESCE(e.tipo_equipo, 'No especificado') AS equipo,
                COALESCE(m.nombre, 'Sin marca') AS marca,
                COALESCE(e.modelo, 'Sin modelo') AS modelo,
                COALESCE(
                    NULLIF(TRIM(CONCAT_WS(' ', u_creador.nombres, u_creador.apellidos)), ''),
                    NULLIF(TRIM(e.encargado_equipo), ''),
                    cl.contacto,
                    'No registrado'
                ) AS encargado,
                COALESCE(cl.zona, 'No asignada') AS zona,
                CONCAT_WS(' ', tecnico.nombres, tecnico.apellidos) AS tecnico_lider,
                (
                    SELECT GROUP_CONCAT(DISTINCT CONCAT_WS(' ', u_apoyo.nombres, u_apoyo.apellidos) ORDER BY u_apoyo.nombres SEPARATOR ', ')
                    FROM asignaciones_tecnicos at_apoyo
                    INNER JOIN usuarios u_apoyo ON u_apoyo.id_usuario = at_apoyo.id_usuario
                    WHERE at_apoyo.id_ot = ot.id_ot AND at_apoyo.id_usuario <> ot.id_tecnico_responsable
                ) AS tecnicos_apoyo,
                COUNT(DISTINCT ods.id_subtipo_servicio) AS total_servicios_equipo,
                GROUP_CONCAT(DISTINCT ts.nombre ORDER BY ts.nombre SEPARATOR ', ') AS tipo_de_servicio,
                GROUP_CONCAT(DISTINCT ss.nombre ORDER BY ss.nombre SEPARATOR ', ') AS servicio,
                DATE_FORMAT(st.fecha_hora_llegada, '%H:%i:%s') AS hora_llegada_cliente,
                DATE_FORMAT(st.fecha_hora_inicio, '%H:%i:%s') AS hora_inicio_servicio,
                DATE_FORMAT(st.fecha_hora_fin, '%H:%i:%s') AS hora_culminacion_servicio,
                COALESCE(DATE_FORMAT(inf.fecha_finalizacion, '%H:%i:%s'), DATE_FORMAT(st.fecha_hora_fin, '%H:%i:%s')) AS hora_servicio_completado
            FROM ordenes_trabajo ot
            INNER JOIN ot_detalles od ON od.id_ot = ot.id_ot
            INNER JOIN cotizaciones c ON c.id_cotizacion = ot.id_cotizacion
            LEFT JOIN usuarios u_creador ON u_creador.id_usuario = c.id_usuario_creador
            INNER JOIN clientes cl ON cl.id_cliente = c.id_cliente
            LEFT JOIN equipos e ON e.id_equipo = od.id_equipo
            LEFT JOIN marcas m ON m.id_marca = e.id_marca
            LEFT JOIN usuarios tecnico ON tecnico.id_usuario = ot.id_tecnico_responsable
            LEFT JOIN ot_detalle_servicios ods ON ods.id_ot_detalle = od.id_ot_detalle
            LEFT JOIN subtipo_servicio ss ON ss.id_subtipo_servicio = ods.id_subtipo_servicio
            LEFT JOIN tipo_servicio ts ON ts.id_tipo_servicio = ss.id_tipo_servicio
            LEFT JOIN servicio_tiempos st ON st.id_ot_detalle = od.id_ot_detalle
            LEFT JOIN informes_servicio inf ON inf.id_ot_detalle = od.id_ot_detalle
            ${whereSql}
            GROUP BY
                od.id_ot_detalle, ot.id_ot, ot.fecha_programada,
                c.nota, e.sede, cl.razon_social, c.centro_costo,
                e.tipo_equipo, m.nombre, e.modelo,
                u_creador.nombres, u_creador.apellidos,
                e.encargado_equipo, cl.contacto,
                cl.zona, tecnico.nombres, tecnico.apellidos,
                st.fecha_hora_llegada, st.fecha_hora_inicio, st.fecha_hora_fin,
                inf.fecha_finalizacion
            ORDER BY ot.id_ot DESC;
        `;

        const [rows] = await db.query(sql, params);

        return rows.map(r => {
            let potencia = '—';
            if (r.modelo) {
                const hpKwMatch = r.modelo.match(/(\d+(?:\.\d+)?)\s*(?:HP|KW|CV)/i);
                if (hpKwMatch) {
                    potencia = `${hpKwMatch[1]} HP`;
                } else {
                    const dashMatch = r.modelo.match(/(?:[A-Za-z]+)-(\d+)(?:-|\s|$)/);
                    if (dashMatch) {
                        potencia = `${dashMatch[1]} HP`;
                    }
                }
            }

            const lider = (r.tecnico_lider || '').trim() || 'Sin asignar';
            const apoyo = (r.tecnicos_apoyo || '').trim();
            const tecnicoCompleto = apoyo ? `${lider} (Líder) + ${apoyo} (Apoyo)` : lider;

            return {
                ot: `OT-${r.ot_numero}`,
                id_ot: r.ot_numero,
                fecha_programada: r.fecha_programada || '—',
                taller_campo: r.taller_campo || 'CAMPO',
                hora_programada: r.hora_programada || '—',
                cliente: r.cliente || '—',
                centro_costo: r.centro_costo || '—',
                equipo: r.equipo || '—',
                marca: r.marca || '—',
                modelo: r.modelo || '—',
                potencia: potencia,
                servicio: r.servicio || '—',
                tipo_de_servicio: r.tipo_de_servicio || '—',
                total_servicios_equipo: Math.max(1, Number(r.total_servicios_equipo) || 1),
                encargado: r.encargado || '—',
                zona: r.zona || '—',
                tecnico_lider: lider,
                tecnicos_apoyo: apoyo,
                tecnico_asignado: tecnicoCompleto,
                hora_llegada_cliente: r.hora_llegada_cliente || '—',
                hora_inicio_servicio: r.hora_inicio_servicio || '—',
                hora_culminacion_servicio: r.hora_culminacion_servicio || '—',
                hora_servicio_completado: r.hora_servicio_completado || '—'
            };
        });
    }

};

export default informetecnicoModel; 
