import db from '../../config/db.js';

export const viaticoModel = {
    async getCatalogos() {
        const [rows] = await db.execute(`
            SELECT c.id_categoria, c.nombre_categoria,
                   s.id_subcategoria, s.nombre_subcategoria
            FROM cat_categorias_gasto c
            INNER JOIN cat_subcategorias_gasto s
                ON s.id_categoria = c.id_categoria
            ORDER BY c.id_categoria, s.nombre_subcategoria
        `);
        return rows;
    },

    async getOrden(idOt) {
        const [rows] = await db.execute(`
            SELECT ot.id_ot, ot.id_tecnico_responsable, ot.estado,
                   c.numero_cotizacion, cl.razon_social
            FROM ordenes_trabajo ot
            INNER JOIN cotizaciones c ON c.id_cotizacion = ot.id_cotizacion
            INNER JOIN clientes cl ON cl.id_cliente = c.id_cliente
            WHERE ot.id_ot = ?
            LIMIT 1
        `, [idOt]);
        return rows[0] ?? null;
    },

    async getByOt(idOt) {
        const [rows] = await db.execute(`
            SELECT v.id_viatico, v.id_ot, v.id_subcategoria, v.monto,
                   v.descripcion, v.fecha_gasto, v.comprobante_url,
                   v.estado, v.fecha_validacion, v.id_usuario_validador,
                   v.fecha_pago, s.id_categoria, s.nombre_subcategoria,
                   c.nombre_categoria
            FROM ot_viaticos v
            INNER JOIN cat_subcategorias_gasto s
                ON s.id_subcategoria = v.id_subcategoria
            INNER JOIN cat_categorias_gasto c
                ON c.id_categoria = s.id_categoria
            WHERE v.id_ot = ?
            ORDER BY v.fecha_gasto DESC, v.id_viatico DESC
        `, [idOt]);
        return rows;
    },

    async getPendientesTecnico(idTecnico) {
        const [rows] = await db.execute(`
            SELECT v.id_viatico, v.id_ot, v.monto, v.descripcion,
                   v.fecha_gasto, v.comprobante_url, v.estado,
                   s.nombre_subcategoria, c.nombre_categoria,
                   cot.numero_cotizacion, cl.razon_social
            FROM ot_viaticos v
            INNER JOIN ordenes_trabajo ot ON ot.id_ot = v.id_ot
            INNER JOIN cotizaciones cot ON cot.id_cotizacion = ot.id_cotizacion
            INNER JOIN clientes cl ON cl.id_cliente = cot.id_cliente
            INNER JOIN cat_subcategorias_gasto s ON s.id_subcategoria = v.id_subcategoria
            INNER JOIN cat_categorias_gasto c ON c.id_categoria = s.id_categoria
            WHERE ot.id_tecnico_responsable = ?
              AND v.estado <> 'pagado'
            ORDER BY v.fecha_gasto DESC, v.id_viatico DESC
        `, [idTecnico]);
        return rows;
    },

    async getAllAdmin() {
        const [rows] = await db.execute(`
            SELECT v.id_viatico, v.id_ot, v.monto, v.descripcion,
                   v.fecha_gasto, v.comprobante_url, v.estado,
                   v.fecha_validacion, v.fecha_pago,
                   s.id_subcategoria, s.nombre_subcategoria,
                   c.id_categoria, c.nombre_categoria,
                   cot.numero_cotizacion, cl.razon_social, cl.ruc,
                   ot.id_tecnico_responsable,
                   CONCAT_WS(' ', tec.nombres, tec.apellidos) AS tecnico_lider
            FROM ot_viaticos v
            INNER JOIN ordenes_trabajo ot ON ot.id_ot = v.id_ot
            INNER JOIN cotizaciones cot ON cot.id_cotizacion = ot.id_cotizacion
            INNER JOIN clientes cl ON cl.id_cliente = cot.id_cliente
            INNER JOIN usuarios tec ON tec.id_usuario = ot.id_tecnico_responsable
            INNER JOIN cat_subcategorias_gasto s ON s.id_subcategoria = v.id_subcategoria
            INNER JOIN cat_categorias_gasto c ON c.id_categoria = s.id_categoria
            ORDER BY v.fecha_gasto DESC, v.id_viatico DESC
        `);
        return rows;
    },

    async getById(idViatico) {
        const [rows] = await db.execute(
            'SELECT * FROM ot_viaticos WHERE id_viatico = ? LIMIT 1',
            [idViatico]
        );
        return rows[0] ?? null;
    },

    async existeSubcategoria(idSubcategoria) {
        const [rows] = await db.execute(
            'SELECT id_subcategoria FROM cat_subcategorias_gasto WHERE id_subcategoria = ? LIMIT 1',
            [idSubcategoria]
        );
        return rows.length > 0;
    },

    async create(data) {
        const [result] = await db.execute(`
            INSERT INTO ot_viaticos
                (id_ot, id_subcategoria, monto, descripcion, fecha_gasto, comprobante_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            data.idOt,
            data.idSubcategoria,
            data.monto,
            data.descripcion,
            data.fechaGasto,
            data.comprobanteUrl
        ]);
        return result.insertId;
    },

    async update(idViatico, data) {
        const [result] = await db.execute(`
            UPDATE ot_viaticos
            SET id_subcategoria = ?, monto = ?, descripcion = ?,
                fecha_gasto = ?, comprobante_url = ?, estado = 'registrado'
            WHERE id_viatico = ?
              AND estado IN ('registrado', 'rechazado')
        `, [
            data.idSubcategoria,
            data.monto,
            data.descripcion,
            data.fechaGasto,
            data.comprobanteUrl,
            idViatico
        ]);
        return result.affectedRows > 0;
    },

    async updateEstado(idViatico, estadoNuevo, estadoActual, idValidador) {
        const [result] = await db.execute(`
            UPDATE ot_viaticos
            SET estado = ?,
                fecha_validacion = CASE
                    WHEN ? IN ('validado', 'rechazado') THEN NOW()
                    ELSE fecha_validacion
                END,
                id_usuario_validador = CASE
                    WHEN ? IN ('validado', 'rechazado') THEN ?
                    ELSE id_usuario_validador
                END,
                fecha_pago = CASE
                    WHEN ? = 'pagado' THEN NOW()
                    ELSE fecha_pago
                END
            WHERE id_viatico = ?
              AND estado = ?
        `, [
            estadoNuevo,
            estadoNuevo,
            estadoNuevo,
            idValidador,
            estadoNuevo,
            idViatico,
            estadoActual
        ]);
        return result.affectedRows > 0;
    },

    async remove(idViatico) {
        const [result] = await db.execute(`
            DELETE FROM ot_viaticos
            WHERE id_viatico = ?
              AND estado IN ('registrado', 'rechazado')
        `, [idViatico]);
        return result.affectedRows > 0;
    }
};
