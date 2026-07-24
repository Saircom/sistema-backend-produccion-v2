import db from '../../config/db.js';

export const tiposervicioModel = {
    /**
     * Obtiene todos los tipos de servicio para llenar el primer select.
     */
    async getAllTipos() {
        const sql = `SELECT id_tipo_servicio, nombre FROM tipo_servicio ORDER BY nombre;`;
        const [rows] = await db.query(sql);
        return rows;
    },

    /**
     * Obtiene solo los subtipos que pertenecen a un tipo_servicio específico.
     * @param {number} id_tipo_servicio - ID del tipo de servicio a filtrar.
     */
    async getByTipoId(id_tipo_servicio) {
        // Validamos que el ID sea un número o tenga contenido antes de consultar
        if (!id_tipo_servicio) return [];

        const sql = `
            SELECT 
                s.id_subtipo_servicio,
                s.codigo,
                s.nombre AS nombre_subtipo
            FROM subtipo_servicio s
            WHERE s.id_tipo_servicio = ?
            ORDER BY s.nombre;
        `;

        const [rows] = await db.query(sql, [id_tipo_servicio]);
        return rows;
    },

    /**
     * Obtiene todos los subtipos de servicio con el nombre de su tipo asociado.
     * Útil para tablas de listado general.
     */
    async getAllWithTipoName() {
        const sql = `
            SELECT 
                s.id_subtipo_servicio,
                s.codigo,
                s.nombre AS nombre_subtipo,
                t.nombre AS nombre_tipo
            FROM subtipo_servicio s
            INNER JOIN tipo_servicio t ON s.id_tipo_servicio = t.id_tipo_servicio
            ORDER BY t.nombre, s.nombre;
        `;

        const [rows] = await db.query(sql);
        return rows;
    }
};