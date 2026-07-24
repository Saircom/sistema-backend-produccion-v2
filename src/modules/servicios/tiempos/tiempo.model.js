import pool from '../../../config/db.js';

class TiempoModel {

    static async listar() {
        const [rows] = await pool.query(`
            SELECT
                od.id_ot_detalle,
                ot.id_ot,
                ot.estado AS estado_ot,
                ot.fecha_programada,
                c.numero_cotizacion,
                cl.razon_social,
                cl.ruc,
                CONCAT_WS(' ', tecnico.nombres, tecnico.apellidos) AS tecnico,
                CONCAT_WS(' ', creador.nombres, creador.apellidos) AS creado_por,
                e.id_equipo,
                e.tipo_equipo,
                m.nombre AS marca,
                e.modelo,
                e.serie,
                e.codigo_interno,
                od.estado_equipo,
                GROUP_CONCAT(
                    DISTINCT CONCAT_WS(' - ', ts.nombre, ss.nombre)
                    ORDER BY ts.nombre, ss.nombre
                    SEPARATOR ', '
                ) AS servicios,
                st.fecha_hora_llegada,
                st.fecha_hora_inicio,
                st.fecha_hora_fin,
                TIMESTAMPDIFF(MINUTE, st.fecha_hora_inicio, st.fecha_hora_fin) AS minutos_trabajados
            FROM servicio_tiempos st
            INNER JOIN ot_detalles od ON od.id_ot_detalle = st.id_ot_detalle
            INNER JOIN ordenes_trabajo ot ON ot.id_ot = od.id_ot
            INNER JOIN cotizaciones c ON c.id_cotizacion = ot.id_cotizacion
            INNER JOIN clientes cl ON cl.id_cliente = c.id_cliente
            INNER JOIN equipos e ON e.id_equipo = od.id_equipo
            LEFT JOIN marcas m ON m.id_marca = e.id_marca
            LEFT JOIN usuarios tecnico ON tecnico.id_usuario = ot.id_tecnico_responsable
            LEFT JOIN usuarios creador ON creador.id_usuario = ot.id_usuario_creador
            LEFT JOIN ot_detalle_servicios ods ON ods.id_ot_detalle = od.id_ot_detalle
            LEFT JOIN subtipo_servicio ss ON ss.id_subtipo_servicio = ods.id_subtipo_servicio
            LEFT JOIN tipo_servicio ts ON ts.id_tipo_servicio = ss.id_tipo_servicio
            GROUP BY
                od.id_ot_detalle, ot.id_ot, ot.estado,
                ot.fecha_programada, c.numero_cotizacion, cl.razon_social,
                cl.ruc, tecnico.nombres, tecnico.apellidos, creador.nombres,
                creador.apellidos, e.id_equipo, e.tipo_equipo, m.nombre,
                e.modelo, e.serie, e.codigo_interno, od.estado_equipo,
                st.fecha_hora_llegada, st.fecha_hora_inicio, st.fecha_hora_fin
            ORDER BY ot.id_ot DESC, od.id_ot_detalle ASC
        `);
        return rows;
    }

    /**
     * Obtiene los tiempos del equipo de la OT.
     */
    static async obtenerPorDetalle(id_ot_detalle) {
        const [rows] = await pool.query(
            `
            SELECT *
            FROM servicio_tiempos
            WHERE id_ot_detalle = ?
            `,
            [id_ot_detalle]
        );

        return rows[0];
    }

    /**
     * Registrar llegada del técnico.
     */
    static async registrarLlegada(id_ot_detalle) {

        const connection = await pool.getConnection();

        try {

            await connection.beginTransaction();

            await connection.query(
                `
                UPDATE servicio_tiempos
                SET fecha_hora_llegada = NOW()
                WHERE id_ot_detalle = ?
                  AND fecha_hora_llegada IS NULL
                `,
                [id_ot_detalle]
            );

            await connection.query(
                `
                UPDATE ot_detalles
                SET estado_equipo = 'En proceso'
                WHERE id_ot_detalle = ?
                `,
                [id_ot_detalle]
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

    /**
     * Registrar inicio del trabajo.
     */
    static async registrarInicio(id_ot_detalle) {

        const [result] = await pool.query(
            `
            UPDATE servicio_tiempos
            SET fecha_hora_inicio = NOW()
            WHERE id_ot_detalle = ?
              AND fecha_hora_llegada IS NOT NULL
              AND fecha_hora_inicio IS NULL
            `,
            [id_ot_detalle]
        );

        return result;
    }

    /**
     * Registrar fin del trabajo.
     */
    static async registrarFin(id_ot_detalle) {

        const connection = await pool.getConnection();

        try {

            await connection.beginTransaction();

            await connection.query(
                `
                UPDATE servicio_tiempos
                SET fecha_hora_fin = NOW()
                WHERE id_ot_detalle = ?
                  AND fecha_hora_inicio IS NOT NULL
                  AND fecha_hora_fin IS NULL
                `,
                [id_ot_detalle]
            );

            await connection.query(
                `
                UPDATE ot_detalles
                SET estado_equipo = 'Finalizado'
                WHERE id_ot_detalle = ?
                `,
                [id_ot_detalle]
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
}

export default TiempoModel;
