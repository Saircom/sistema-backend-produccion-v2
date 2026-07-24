import db from '../../config/db.js';

export const cotizacionModel = {
    async getAll() {
        const sql = `
            SELECT s.id_servicio, c.razon_social, s.tipoServicio, i.recomendaciones, 
                   c.zona, s.tipo_pago, i.estado_cotizacion 
            FROM informe_tecnico i
            JOIN servicios s ON i.id_servicio = s.id_servicio
            JOIN clientes c ON s.id_cliente = c.id_cliente`;
        const [rows] = await db.query(sql);
        return rows;
    },

    async getEstadoActual(id_servicio) {
        const sql = "SELECT estado_cotizacion FROM informe_tecnico WHERE id_servicio = ?";
        const [rows] = await db.query(sql, [id_servicio]);
        return rows.length > 0 ? rows[0].estado_cotizacion : null;
    },

    async updateEstado(id_servicio, estado_cotizacion) {
        const sql = "UPDATE informe_tecnico SET estado_cotizacion = ? WHERE id_servicio = ?";
        const [result] = await db.query(sql, [estado_cotizacion, id_servicio]);
        return result;
    }
};

