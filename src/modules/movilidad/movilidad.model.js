import db from '../../config/db.js';

export const movilidadModel = {

    // CORREGIDO: Ahora retorna todos los registros, no solo el primero
    async getAll() {
        const [rows] = await db.query(`
            SELECT m.*, pm.proxima_fecha_mantenimiento,
                   pm.proximo_kilometraje, pm.dias_alerta, pm.kilometros_alerta
            FROM movilidades m
            LEFT JOIN mantenimientos pm ON pm.id = (
                SELECT mt.id FROM mantenimientos mt
                WHERE mt.movilidad_id = m.id_movilidad
                  AND (mt.proxima_fecha_mantenimiento IS NOT NULL OR mt.proximo_kilometraje IS NOT NULL)
                ORDER BY mt.fecha_mantenimiento DESC, mt.id DESC LIMIT 1
            )
            ORDER BY m.placa
        `);
        return rows;
    },

    // --- MOVILIDADES (Catálogo) ---
    async getById(id) {
        const [rows] = await db.query('SELECT * FROM movilidades WHERE id_movilidad = ?', [id]);
        return rows[0]; // Esto está bien porque buscas uno solo
    },

    async createMovilidad(data) {
        const { placa, marca, modelo, tipo_vehiculo, kilometraje_actual } = data;

        try {
            const [result] = await db.query(
                `INSERT INTO movilidades (placa, marca, modelo, tipo_vehiculo, kilometraje_actual) 
                 VALUES (?, ?, ?, ?, ?)`,
                [placa, marca, modelo, tipo_vehiculo, kilometraje_actual || 0]
            );
            return result.insertId;
        } catch (error) {
            throw new Error("Error al crear la movilidad: " + error.message);
        }
    },

    async updateMovilidad(idMovilidad, data) {
        const [result] = await db.execute(
            `UPDATE movilidades m
             SET placa = ?, marca = ?, modelo = ?, tipo_vehiculo = ?,
                 kilometraje_actual = ?,
                 estado_disponibilidad = CASE
                     WHEN ? = 'En mantenimiento' THEN 'En mantenimiento'
                     WHEN EXISTS (
                         SELECT 1 FROM ordenes_trabajo ot
                         WHERE ot.id_movilidad = m.id_movilidad
                           AND ot.estado <> 'Finalizada'
                     ) THEN 'En uso'
                     ELSE 'Disponible'
                 END
             WHERE id_movilidad = ?`,
            [data.placa, data.marca, data.modelo, data.tipo_vehiculo,
                data.kilometraje_actual, data.estado_disponibilidad, idMovilidad]
        );

        return result.affectedRows > 0;
    },
    // --- MANTENIMIENTOS (Historial) ---
    async registrarMantenimiento(data) {
        const { movilidad_id, fecha_mantenimiento, kilometraje_al_momento, tipo,
            descripcion_trabajo, observaciones, proxima_fecha_mantenimiento,
            proximo_kilometraje, dias_alerta, kilometros_alerta } = data;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Insertar el mantenimiento (Esto ya estaba bien)
            await connection.query(
                `INSERT INTO mantenimientos (
                    movilidad_id, fecha_mantenimiento, kilometraje_al_momento, tipo,
                    descripcion_trabajo, observaciones, proxima_fecha_mantenimiento,
                    proximo_kilometraje, dias_alerta, kilometros_alerta
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [movilidad_id, fecha_mantenimiento, kilometraje_al_momento, tipo,
                    descripcion_trabajo, observaciones, proxima_fecha_mantenimiento || null,
                    proximo_kilometraje || null, dias_alerta, kilometros_alerta]
            );

            // 2. ACTUALIZAR el kilometraje (CORREGIDO: WHERE id = ?)
            await connection.query(
                'UPDATE movilidades SET kilometraje_actual = ? WHERE id_movilidad = ?',
                [kilometraje_al_momento, movilidad_id]
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw new Error("Error en transacción: " + error.message);
        } finally {
            connection.release();
        }
    },

    async getHistorialMantenimiento(movilidad_id) {
        const [rows] = await db.query(
            'SELECT * FROM mantenimientos WHERE movilidad_id = ? ORDER BY fecha_mantenimiento DESC',
            [movilidad_id]
        );
        return rows;
    },

    // --- DOCUMENTOS (Gestión de Archivos con Transacción) ---
    async registrarDocumento(data) {

        const connection = await db.getConnection();

        try {

            await connection.beginTransaction();

            const [result] = await connection.query(
                `INSERT INTO documentos (
                    movilidad_id,
                    tipo_documento,
                    fecha_emision,
                    fecha_vencimiento,
                    url_archivo,
                    public_id_cloudinary
                )
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    data.movilidad_id,
                    data.tipo_documento,
                    data.fecha_emision,
                    data.fecha_vencimiento,
                    data.url_archivo,
                    data.public_id_cloudinary
                ]
            );

            await connection.commit();

            return result.insertId;

        } catch (error) {

            await connection.rollback();
            throw new Error("Error al registrar documento: " + error.message);

        } finally {

            connection.release();

        }
    },

    async getDocumentos(movilidad_id) {
        // Ordenamos por fecha_vencimiento DESC para ver los más cercanos arriba
        const [rows] = await db.query('SELECT * FROM documentos WHERE movilidad_id = ? ORDER BY fecha_vencimiento DESC', [movilidad_id]);
        return rows;
    }
};
