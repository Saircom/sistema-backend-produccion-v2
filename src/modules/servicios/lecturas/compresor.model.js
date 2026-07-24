export const CompresorModel = {

    async save(connection, id_servicio, data) {
        // Función de normalización: ahora devuelve explícitamente null o el valor como String
        const parseValue = (val, type = 'string') => {
            // Manejo de vacíos, null, undefined o ceros representados de cualquier forma
            if (val === null || val === undefined || val === "" || val === 0 || val === "0" || val === "0.00") {
                return null;
            }

            if (type === 'float') {
                const parsed = parseFloat(val);
                // Si tras parsear sigue siendo 0 o NaN, es nulo
                return (isNaN(parsed) || parsed === 0) ? null : String(parsed);
            }

            return String(val); // Forzamos a String para consistencia con VARCHAR
        };

        const payload = {
            id_servicio: parseInt(id_servicio),
            horometro: parseValue(data.horometro, 'float'),
            temp_descarga: parseValue(data.temp_descarga, 'float'),
            unidadpn: parseValue(data.unidadpn),
            unidadsn: parseValue(data.unidadsn),
            tipo_arranque: parseValue(data.tipo_arranque),
            volt_equipo: parseValue(data.volt_equipo),
            amp_motor: parseValue(data.amp_motor, 'float'),
            presion_carga: parseValue(data.presion_carga, 'float'),
            presion_descarga: parseValue(data.presion_descarga, 'float'),
            amp_motor_ventilador: parseValue(data.amp_motor_ventilador, 'float'),
            tipo_aceite: parseValue(data.tipo_aceite),
            nivel_aceite: parseValue(data.nivel_aceite),
            equipo_operacion: parseValue(data.equipo_operacion),
            inspfiltroaceite: parseValue(data.inspfiltroaceite)
        };
        // Incluimos ID solo si existe para permitir la actualización
        if (data.id_lectura) {
            payload.id_lectura = data.id_lectura;
        }

        const sql = `INSERT INTO lecturas_compresor SET ? 
                     ON DUPLICATE KEY UPDATE 
                     horometro = VALUES(horometro), temp_descarga = VALUES(temp_descarga), 
                     unidadpn = VALUES(unidadpn), unidadsn = VALUES(unidadsn), 
                     tipo_arranque = VALUES(tipo_arranque), volt_equipo = VALUES(volt_equipo), 
                     amp_motor = VALUES(amp_motor), presion_carga = VALUES(presion_carga), 
                     presion_descarga = VALUES(presion_descarga), amp_motor_ventilador = VALUES(amp_motor_ventilador), 
                     tipo_aceite = VALUES(tipo_aceite), nivel_aceite = VALUES(nivel_aceite), 
                     equipo_operacion = VALUES(equipo_operacion), inspfiltroaceite = VALUES(inspfiltroaceite)`;

        const [result] = await connection.query(sql, payload);
        return result;
    },
    async update(connection, id_servicio, data) {
        console.log("Datos recibidos para actualizar:", data);
        console.log("ID de servicio:", id_servicio);
        const sql = `
        UPDATE lecturas_compresor 
        SET 
            horometro = ?, temp_descarga = ?, unidadpn = ?, unidadsn = ?, 
            tipo_arranque = ?, volt_equipo = ?, amp_motor = ?, presion_carga = ?, 
            presion_descarga = ?, amp_motor_ventilador = ?, tipo_aceite = ?, 
            nivel_aceite = ?, equipo_operacion = ?, inspfiltroaceite = ?
        WHERE id_servicio = ?
    `;

        const params = [
            data.horometro,          // 1
            data.temp_descarga,      // 2
            data.unidadpn,           // 3
            data.unidadsn,           // 4
            data.tipo_arranque,      // 5
            data.volt_equipo,        // 6
            data.amp_motor,          // 7
            data.presion_carga,      // 8
            data.presion_descarga,   // 9
            data.amp_motor_ventilador,// 10
            data.tipo_aceite,        // 11
            data.nivel_aceite,       // 12
            data.equipo_operacion,   // 13
            data.inspfiltroaceite,   // 14 <-- ¿Este es el campo nuevo?
            parseInt(id_servicio)    // 15 (WHERE)
        ];

        const [result] = await connection.query(sql, params);
        return result;
    },

    /**
     * Obtiene las lecturas de un servicio específico
     */
    async getByService(connection, id_servicio) {
        const [rows] = await connection.query(
            "SELECT * FROM lecturas_compresor WHERE id_servicio = ?",
            [parseInt(id_servicio)]
        );
        return rows[0] || null;
    }
};