export const VoltajeAmperajeModel = {
    /**
     * Guarda o actualiza las lecturas de voltaje y amperaje del servicio.
     * @param {Object} connection - La conexión activa de la transacción.
     * @param {number|string} id_servicio - ID del servicio asociado.
     * @param {Object} data - Datos provenientes del formulario del técnico.
     */
    async save(connection, id_servicio, data) {
        // 1. Armamos el payload con la estructura exacta de la tabla voltaje_amperaje
        // Como todos los campos de datos son VARCHAR(50), los manejamos como strings o nulls.
        const payload = {
            id_servicio: parseInt(id_servicio),
            amp1: data.amp1 !== undefined && data.amp1 !== "" ? String(data.amp1) : null,
            amp2: data.amp2 !== undefined && data.amp2 !== "" ? String(data.amp2) : null,
            amp3: data.amp3 !== undefined && data.amp3 !== "" ? String(data.amp3) : null,

            amp_vacio_minimo_l1: data.amp_vacio_minimo_l1 !== undefined && data.amp_vacio_minimo_l1 !== "" ? String(data.amp_vacio_minimo_l1) : null,
            amp_vacio_minimo_l2: data.amp_vacio_minimo_l2 !== undefined && data.amp_vacio_minimo_l2 !== "" ? String(data.amp_vacio_minimo_l2) : null,
            amp_vacio_minimo_l3: data.amp_vacio_minimo_l3 !== undefined && data.amp_vacio_minimo_l3 !== "" ? String(data.amp_vacio_minimo_l3) : null,

            volt1: data.volt1 !== undefined && data.volt1 !== "" ? String(data.volt1) : null,
            volt2: data.volt2 !== undefined && data.volt2 !== "" ? String(data.volt2) : null,
            volt3: data.volt3 !== undefined && data.volt3 !== "" ? String(data.volt3) : null,

            vacio_minimo_l1: data.vacio_minimo_l1 !== undefined && data.vacio_minimo_l1 !== "" ? String(data.vacio_minimo_l1) : null,
            vacio_minimo_l2: data.vacio_minimo_l2 !== undefined && data.vacio_minimo_l2 !== "" ? String(data.vacio_minimo_l2) : null,
            vacio_minimo_l3: data.vacio_minimo_l3 !== undefined && data.vacio_minimo_l3 !== "" ? String(data.vacio_minimo_l3) : null
        };

        // Si se está editando un registro existente, incluimos su PK (id_voltaje_amperaje)
        if (data.id_voltaje_amperaje) {
            payload.id_voltaje_amperaje = parseInt(data.id_voltaje_amperaje);
        }

        // 2. Query usando la sintaxis estándar para mysql2 con ON DUPLICATE KEY UPDATE
        const sql = `
            INSERT INTO voltaje_amperaje SET ?
            ON DUPLICATE KEY UPDATE
                amp1 = VALUES(amp1),
                amp2 = VALUES(amp2),
                amp3 = VALUES(amp3),
                amp_vacio_minimo_l1 = VALUES(amp_vacio_minimo_l1),
                amp_vacio_minimo_l2 = VALUES(amp_vacio_minimo_l2),
                amp_vacio_minimo_l3 = VALUES(amp_vacio_minimo_l3),
                volt1 = VALUES(volt1),
                volt2 = VALUES(volt2),
                volt3 = VALUES(volt3),
                vacio_minimo_l1 = VALUES(vacio_minimo_l1),
                vacio_minimo_l2 = VALUES(vacio_minimo_l2),
                vacio_minimo_l3 = VALUES(vacio_minimo_l3)
        `;

        // Al pasar payload, el driver mapeará automáticamente las llaves
        const [result] = await connection.query(sql, payload);
        return result;
    },
    async update(connection, id_voltaje_amperaje, data) {
        // Definimos solo los campos permitidos para actualizar
        const updateData = {
            amp1: data.amp1 !== undefined && data.amp1 !== "" ? String(data.amp1) : null,
            amp2: data.amp2 !== undefined && data.amp2 !== "" ? String(data.amp2) : null,
            amp3: data.amp3 !== undefined && data.amp3 !== "" ? String(data.amp3) : null,
            amp_vacio_minimo_l1: data.amp_vacio_minimo_l1 !== undefined && data.amp_vacio_minimo_l1 !== "" ? String(data.amp_vacio_minimo_l1) : null,
            amp_vacio_minimo_l2: data.amp_vacio_minimo_l2 !== undefined && data.amp_vacio_minimo_l2 !== "" ? String(data.amp_vacio_minimo_l2) : null,
            amp_vacio_minimo_l3: data.amp_vacio_minimo_l3 !== undefined && data.amp_vacio_minimo_l3 !== "" ? String(data.amp_vacio_minimo_l3) : null,
            volt1: data.volt1 !== undefined && data.volt1 !== "" ? String(data.volt1) : null,
            volt2: data.volt2 !== undefined && data.volt2 !== "" ? String(data.volt2) : null,
            volt3: data.volt3 !== undefined && data.volt3 !== "" ? String(data.volt3) : null,
            vacio_minimo_l1: data.vacio_minimo_l1 !== undefined && data.vacio_minimo_l1 !== "" ? String(data.vacio_minimo_l1) : null,
            vacio_minimo_l2: data.vacio_minimo_l2 !== undefined && data.vacio_minimo_l2 !== "" ? String(data.vacio_minimo_l2) : null,
            vacio_minimo_l3: data.vacio_minimo_l3 !== undefined && data.vacio_minimo_l3 !== "" ? String(data.vacio_minimo_l3) : null
        };

        // Construimos el query usando el ID como filtro
        const sql = `UPDATE voltaje_amperaje SET ? WHERE id_voltaje_amperaje = ?`;

        const [result] = await connection.query(sql, [updateData, parseInt(id_voltaje_amperaje)]);
        return result;
    }
};