export const FirmaModel = {

    // 1. Crear o Actualizar (Upsert) - Útil si no sabes si el registro ya existe
    async save(connection, data) {
        const sql = `
            INSERT INTO servicio_responsable (id_servicio, firma, encargado)
            VALUES (?, ?, ?) AS nueva_data
            ON DUPLICATE KEY UPDATE
                firma = nueva_data.firma,
                encargado = nueva_data.encargado
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
            UPDATE servicio_responsable
            SET 
                firma = ?,
                encargado = ?
            WHERE id_servicio = ?
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
            `SELECT id_servicio, firma, encargado 
             FROM servicio_responsable 
             WHERE id_servicio = ?`,
            [id_servicio]
        );

        return rows[0] || null;
    }

};