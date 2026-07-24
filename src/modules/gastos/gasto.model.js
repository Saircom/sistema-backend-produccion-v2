import pool from '../../config/db.js';
import { hasAnyRole } from '../../utils/roles.js';

export const Gasto = {
    // Método auxiliar para decidir si usar una transacción o el pool global
    async ejecutarQuery(query, params, connection = null) {
        if (connection) {
            return await connection.query(query, params);
        }
        return await pool.query(query, params);
    },

    async obtenerTodos(usuario) {
        let query = `
            SELECT s.id_servicio, c.razon_social AS cliente, u.nombres AS usuario, 
                   s.tipoServicio, s.estado, gc.id_gasto_c, gc.cantidad_recibida, 
                   COALESCE(SUM(gd.monto), 0) AS total_gastado
            FROM gastos_cabecera gc
            INNER JOIN servicios s ON gc.id_servicio = s.id_servicio
            LEFT JOIN clientes c ON s.id_cliente = c.id_cliente
            LEFT JOIN usuarios u ON s.id_usuario = u.id_usuario
            LEFT JOIN gastos_detalle gd ON gc.id_gasto_c = gd.id_gasto_c
        `;

        const params = [];
        // Si el rol es distinto de 'ADMIN', filtramos por su ID
        if (!hasAnyRole(usuario, 'ADMINISTRADOR')) {
            query += ` WHERE s.id_usuario = ? `;
            params.push(usuario.id_usuario);
        }

        query += ` GROUP BY gc.id_gasto_c ORDER BY gc.id_gasto_c DESC`;

        const [rows] = await pool.query(query, params);
        return rows;
    },

    async obtenerPorId(idGasto, usuario) {
        let query = `SELECT * FROM gastos_cabecera gc 
                     JOIN servicios s ON gc.id_servicio = s.id_servicio 
                     WHERE gc.id_gasto_c = ?`;
        const params = [idGasto];

        if (!hasAnyRole(usuario, 'ADMINISTRADOR')) {
            query += ` AND s.id_usuario = ?`;
            params.push(usuario.id_usuario);
        }

        const [rows] = await pool.query(query, params);
        return rows[0];
    },
    async obtenerPorServicio(idServicio) {
        const [rows] = await pool.query(`
            SELECT gc.*, gd.id_detalle, gd.fecha_gasto, gd.categoria, gd.descripcion, gd.monto
            FROM gastos_cabecera gc
            LEFT JOIN gastos_detalle gd ON gc.id_gasto_c = gd.id_gasto_c
            WHERE gc.id_servicio = ?
            ORDER BY gd.fecha_gasto DESC
        `, [idServicio]);
        return rows;
    },

    // --- Escrituras (Soportan Transacciones) ---
    async crearCabecera(data, connection = null) {
        const [result] = await this.ejecutarQuery(`
            INSERT INTO gastos_cabecera (tipo_origen, id_servicio, cantidad_recibida, fecha_cierre)
            VALUES (?, ?, ?, ?)
        `, [data.tipo_origen, data.id_servicio || null, data.cantidad_recibida || 0, data.fecha_cierre || null], connection);
        return result.insertId;
    },

    async agregarDetalle(data, connection = null) {
        const [result] = await this.ejecutarQuery(`
            INSERT INTO gastos_detalle (id_gasto_c, fecha_gasto, categoria, descripcion, monto)
            VALUES (?, ?, ?, ?, ?)
        `, [data.id_gasto_c, data.fecha_gasto, data.categoria, data.descripcion, data.monto], connection);
        return result.insertId;
    },

    async actualizarCabecera(idGasto, data, connection = null) {
        const [result] = await this.ejecutarQuery(`
            UPDATE gastos_cabecera
            SET cantidad_recibida = ?, fecha_cierre = ?, estado_revision = ?, observaciones_revision = ?, fecha_aprobacion = ?
            WHERE id_gasto_c = ?
        `, [data.cantidad_recibida, data.fecha_cierre, data.estado_revision, data.observaciones_revision, data.fecha_aprobacion, idGasto], connection);
        return result.affectedRows;
    },

    async actualizarDetalle(idDetalle, data, connection = null) {
        const [result] = await this.ejecutarQuery(`
            UPDATE gastos_detalle
            SET fecha_gasto = ?, categoria = ?, descripcion = ?, monto = ?
            WHERE id_detalle = ?
        `, [data.fecha_gasto, data.categoria, data.descripcion, data.monto, idDetalle], connection);
        return result.affectedRows;
    },

    async eliminarDetalle(idDetalle, connection = null) {
        const [result] = await this.ejecutarQuery(`DELETE FROM gastos_detalle WHERE id_detalle = ?`, [idDetalle], connection);
        return result.affectedRows;
    },

    async eliminarCabecera(idGasto, connection = null) {
        const [result] = await this.ejecutarQuery(`DELETE FROM gastos_cabecera WHERE id_gasto_c = ?`, [idGasto], connection);
        return result.affectedRows;
    }
};
