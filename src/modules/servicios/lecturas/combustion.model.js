export const CombustionModel = {
    /**
     * Guarda o actualiza las lecturas de combustión.
     */
    async save(connection, id_servicio, data) {
        const payload = {
            id_servicio: parseInt(id_servicio),
            marca_combu: data.marca_combu || null,
            modelo_combu: data.modelo_combu || null,
            serie_combu: data.serie_combu || null,
            voltaje_combu: parseFloat(data.voltaje_combu) || null,
            presion_aceite_combu: parseFloat(data.presion_aceite_combu) || null,
            rpm_maximo_combu: parseFloat(data.rpm_maximo_combu) || null,
            rpm_minimo_combu: parseFloat(data.rpm_minimo_combu) || null,
            tipo_aceite_combu: data.tipo_aceite_combu || null,
            nivel_aceite_combu: data.nivel_aceite_combu || null,
            nivel_refrigerante_combu: data.nivel_refrigerante_combu || null
        };

        const sql = `
            INSERT INTO lecturas_combustion SET ?
            ON DUPLICATE KEY UPDATE
                marca_combu = VALUES(marca_combu),
                modelo_combu = VALUES(modelo_combu),
                serie_combu = VALUES(serie_combu),
                voltaje_combu = VALUES(voltaje_combu),
                presion_aceite_combu = VALUES(presion_aceite_combu),
                rpm_maximo_combu = VALUES(rpm_maximo_combu),
                rpm_minimo_combu = VALUES(rpm_minimo_combu),
                tipo_aceite_combu = VALUES(tipo_aceite_combu),
                nivel_aceite_combu = VALUES(nivel_aceite_combu),
                nivel_refrigerante_combu = VALUES(nivel_refrigerante_combu)
        `;

        const [result] = await connection.query(sql, [payload]);
        return result;
    },

    async update(connection, id_servicio, data) {
        const payload = {
            marca_combu: data.marca_combu || null,
            modelo_combu: data.modelo_combu || null,
            serie_combu: data.serie_combu || null,
            voltaje_combu: parseFloat(data.voltaje_combu) || null,
            presion_aceite_combu: parseFloat(data.presion_aceite_combu) || null,
            rpm_maximo_combu: parseFloat(data.rpm_maximo_combu) || null,
            rpm_minimo_combu: parseFloat(data.rpm_minimo_combu) || null,
            tipo_aceite_combu: data.tipo_aceite_combu || null,
            nivel_aceite_combu: data.nivel_aceite_combu || null,
            nivel_refrigerante_combu: data.nivel_refrigerante_combu || null
        };

        const sql = `UPDATE lecturas_combustion SET ? WHERE id_servicio = ?`;

        const [result] = await connection.query(sql, [payload, parseInt(id_servicio)]);
        return result;
    }
};