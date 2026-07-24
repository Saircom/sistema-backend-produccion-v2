export const InformeModel = {

    async save(connection, id_servicio, data) {

        const parseText = (val) => {
            if (
                val === null ||
                val === undefined ||
                String(val).trim() === ""
            ) {
                return null;
            }

            return String(val).trim();
        };

        const payload = {
            id_servicio: Number(id_servicio),

            descripcionTrabajo: parseText(data.descripcionTrabajo),

            recomendaciones: parseText(data.recomendaciones),

            conclusiones: parseText(data.conclusiones)
        };

        // Si existe id_lectura, lo agregamos
        if (data.id_lectura) {
            payload.id_lectura = Number(data.id_lectura);
        }

        const sql = `
        INSERT INTO informe_tecnico SET ?
        ON DUPLICATE KEY UPDATE
            descripcionTrabajo = VALUES(descripcionTrabajo),
            recomendaciones = VALUES(recomendaciones),
            conclusiones = VALUES(conclusiones)
    `;

        const [result] = await connection.query(sql, payload);

        return result;
    },
    async update(connection, id_servicio, data) {

        const parseText = (val) => {
            if (
                val === null ||
                val === undefined ||
                String(val).trim() === ""
            ) {
                return null;
            }

            return String(val).trim();
        };

        const payload = {
            descripcionTrabajo: parseText(data.descripcionTrabajo),
            recomendaciones: parseText(data.recomendaciones),
            conclusiones: parseText(data.conclusiones)
        };

        const sql = `
        UPDATE informe_tecnico
        SET
            descripcionTrabajo = ?,
            recomendaciones = ?,
            conclusiones = ?
        WHERE id_servicio = ?
    `;

        const values = [
            payload.descripcionTrabajo,
            payload.recomendaciones,
            payload.conclusiones,
            id_servicio
        ];

        const [result] = await connection.query(sql, values);

        return result;
    },

    /**
     * Obtiene las lecturas de un servicio específico
     */
    async getByService(connection, id_servicio) {
        const [rows] = await connection.query(
            "SELECT * FROM informe_tecnico WHERE id_servicio = ?",
            [parseInt(id_servicio)]
        );
        return rows[0] || null;
    }
};