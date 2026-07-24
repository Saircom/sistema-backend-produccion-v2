// src/modules/equipos/equipos.repository.js
import db from '../../config/db.js';

export const equiposRepository = {

    // 1. En getAll: Añadimos e.id_marca para enviarlo al frontend
    async getAll() {
        const sql = `
            SELECT 
                e.id_equipo, e.id_cliente, e.tipo_equipo, e.sede, e.direccion, e.modelo, e.serie, e.encargado_equipo, e.codigo_interno,
                e.id_marca, -- CORRECCIÓN: Enviamos el ID para que los formularios puedan leerlo
                m.nombre AS marca,
                c.razon_social, c.ruc
            FROM equipos e
            LEFT JOIN clientes c ON e.id_cliente = c.id_cliente
            LEFT JOIN marcas m ON e.id_marca = m.id_marca
            ORDER BY c.razon_social ASC, e.id_equipo DESC
        `;
        const [rows] = await db.query(sql);
        return rows;
    },

    // 2. En getByCliente: Añadimos e.id_marca aquí también
    async getByCliente(idCliente) {
        const sql = `
            SELECT 
                e.id_equipo, e.tipo_equipo, e.sede, e.direccion, e.modelo, e.serie, e.encargado_equipo, e.codigo_interno,
                e.id_marca, -- CORRECCIÓN: Esencial para que el modal de edición preseleccione la marca
                m.nombre AS marca
            FROM equipos e
            LEFT JOIN marcas m ON e.id_marca = m.id_marca
            WHERE e.id_cliente = ?
            ORDER BY e.modelo ASC
        `;
        const [rows] = await db.query(sql, [idCliente]);
        return rows;
    },

    // 3. En getById: Ya incluye e.* por lo que id_marca ya se enviaba correctamente
    async getById(idEquipo) {
        const sql = `
            SELECT 
                e.*,
                cli.nombre_comercial, cli.ruc,
                m.nombre AS marca,
                com.id_componente, 
                com.marca_secador, com.modelo_secador, com.serie_secador,
                com.marca_combu, com.modelo_combu, com.serie_combu
            FROM equipos e
            LEFT JOIN clientes cli ON e.id_cliente = cli.id_cliente
            LEFT JOIN marcas m ON e.id_marca = m.id_marca
            LEFT JOIN componentes_equipo com ON e.id_equipo = com.id_equipo
            WHERE e.id_equipo = ?
        `;
        const [rows] = await db.query(sql, [idEquipo]);
        return rows[0] || null;
    },

    async create(equipo) {
        console.log("Datos recibidos en backend:", equipo);

        if (!equipo.id_cliente) {
            throw new Error("Error de integridad: El equipo debe estar asociado a un cliente.");
        }

        const sql = `
            INSERT INTO equipos (id_cliente, tipo_equipo, sede, direccion, id_marca, modelo, serie, encargado_equipo, codigo_interno)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            equipo.id_cliente,
            equipo.tipo_equipo,
            equipo.sede,
            equipo.direccion,
            equipo.id_marca, 
            equipo.modelo,
            equipo.serie,
            equipo.encargado_equipo,
            equipo.codigo_interno
        ];

        try {
            const [result] = await db.query(sql, params);
            return result.insertId;
        } catch (error) {
            console.error("Error exacto en la BD:", error.sqlMessage || error.message);
            throw error;
        }
    },

    // 5. En update: Corregido error ortográfico en los parámetros
    async update(id, data) {
        const sql = `
            UPDATE equipos 
            SET id_cliente = ?, tipo_equipo = ?, sede = ?, direccion = ?, id_marca = ?, modelo = ?, serie = ?, encargado_equipo = ?, codigo_interno = ?
            WHERE id_equipo = ?
        `;
        const params = [
            data.id_cliente || null,
            data.tipo_equipo,
            data.sede,
            data.direccion,
            data.id_marca, 
            data.modelo,
            data.serie,
            data.encargado_equipo,
            data.codigo_interno,
            id
        ];
        const [res] = await db.query(sql, params);
        return res.affectedRows > 0;
    },

    async remove(id) {
        const [res] = await db.query("DELETE FROM equipos WHERE id_equipo = ?", [id]);
        return res.affectedRows > 0;
    }
};
