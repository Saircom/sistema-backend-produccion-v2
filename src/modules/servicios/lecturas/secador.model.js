export const SecadorModel = {
    /**
     * Guarda o actualiza las lecturas del secador.
     * Todas las columnas numéricas ahora son VARCHAR(50).
     */
    async save(connection, id_servicio, data) {
        // Función de normalización estricta para VARCHAR
        const format = (val) => {
            // Si es null, undefined, vacío o representa un cero, retornamos null
            if (val === null || val === undefined || val === "" || val === 0 || val === "0" || val === "0.00") {
                return null;
            }

            // Convertimos cualquier valor restante a String para cumplir con VARCHAR
            return String(val);
        };

        const payload = {
            id_servicio: parseInt(id_servicio),
            marca_secador: format(data.marca_secador),
            modelo_secador: format(data.modelo_secador),
            serie_secador: format(data.serie_secador),
            // Al ser VARCHAR, ya no necesitamos el parámetro 'float'
            voltaje_secador: format(data.voltaje_secador),
            amperaje_secador: format(data.amperaje_secador),
            punto_rocio: format(data.punto_rocio),
            tipo_refrigeracion: format(data.tipo_refrigeracion)
        };

        // Incluimos ID si existe
        if (data.id_lectura_secador) {
            payload.id_lectura_secador = data.id_lectura_secador;
        }

        const sql = `
            INSERT INTO lecturas_secador SET ?
            ON DUPLICATE KEY UPDATE
                marca_secador = VALUES(marca_secador),
                modelo_secador = VALUES(modelo_secador),
                serie_secador = VALUES(serie_secador),
                voltaje_secador = VALUES(voltaje_secador),
                amperaje_secador = VALUES(amperaje_secador),
                punto_rocio = VALUES(punto_rocio),
                tipo_refrigeracion = VALUES(tipo_refrigeracion)
        `;

        const [result] = await connection.query(sql, [payload]);
        return result;
    },
    async update(connection, id_servicio, data) {
        const sql = `
            UPDATE lecturas_secador 
            SET 
                marca_secador = ?, 
                modelo_secador = ?, 
                serie_secador = ?, 
                voltaje_secador = ?, 
                amperaje_secador = ?, 
                punto_rocio = ?, 
                tipo_refrigeracion = ?
            WHERE id_servicio = ?
        `;

        const params = [
            data.marca_secador || null,
            data.modelo_secador || null,
            data.serie_secador || null,
            data.voltaje_secador || null,
            data.amperaje_secador || null,
            data.punto_rocio || null,
            data.tipo_refrigeracion || null,
            parseInt(id_servicio)
        ];

        const [result] = await connection.query(sql, params);
        return result;
    }
};