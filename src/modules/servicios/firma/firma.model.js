export const FirmaModel = {

    // 1. Crear o Actualizar (Upsert) - Útil si no sabes si el registro ya existe
    async save(connection, data) {
        const sql = `
            INSERT INTO cierre_responsable (id_informe, firma, encargado)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                firma = VALUES(firma),
                encargado = VALUES(encargado)
        `;

        const values = [
            data.id_servicio,
            data.firma,
            data.encargado
        ];

        const [result] = await connection.query(sql, values);
        return result;
    },

    // 2. Actualizar (Específico) - Ideal para editar registros que ya existen
    async update(connection, id_servicio, data) {
        const sql = `
            UPDATE cierre_responsable
            SET 
                firma = ?,
                encargado = ?
            WHERE id_informe = ?
        `;

        const values = [
            data.firma,
            data.encargado,
            id_servicio
        ];

        const [result] = await connection.query(sql, values);
        
        // Retorna un booleano indicando si realmente se modificó alguna fila
        return result.affectedRows > 0;
    },

    // 3. Buscar por ID de Servicio
    async findByServicio(connection, id_servicio) {
        const [rows] = await connection.query(
            `SELECT id_informe AS id_servicio, firma, encargado
             FROM cierre_responsable
             WHERE id_informe = ?`,
            [id_servicio]
        );

        return rows[0] || null;
    }

};
