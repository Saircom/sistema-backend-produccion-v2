import db from '../../config/db.js';

export const marcasRepository = {
    async getAllActive() {
        const sql = "SELECT id_marca, nombre FROM marcas WHERE estado = 1 ORDER BY nombre ASC";
        const [rows] = await db.query(sql);
        return rows;
    }
};