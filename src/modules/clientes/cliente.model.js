// src/modules/clientes/clientes.model.js
import db from '../../config/db.js';

const Cliente = {
    // Trae todos los clientes concatenando el nombre completo del creador
    getAll: async () => {
        const [rows] = await db.query(`
            SELECT c.*, CONCAT(u.nombres, ' ', u.apellidos) AS creado_por_nombre 
            FROM clientes c
            LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
            ORDER BY c.id_cliente DESC
        `);
        return rows;
    },

    // Detalle de un cliente por ID
    getById: async (id) => {
        const [rows] = await db.query(`
            SELECT c.*, CONCAT(u.nombres, ' ', u.apellidos) AS creado_por_nombre 
            FROM clientes c
            LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
            WHERE c.id_cliente = ?
        `, [id]);
        return rows[0] || null;
    },

    // Búsqueda aproximada incluyendo datos del creador
    search: async (query) => {
        const searchQuery = `%${query}%`;
        const [rows] = await db.query(`
            SELECT c.*, CONCAT(u.nombres, ' ', u.apellidos) AS creado_por_nombre 
            FROM clientes c
            LEFT JOIN usuarios u ON c.creado_por = u.id_usuario
            WHERE c.ruc LIKE ? OR c.razon_social LIKE ? 
            ORDER BY c.id_cliente DESC
        `, [searchQuery, searchQuery]);
        return rows;
    },

    checkDuplicate: async (ruc, correo) => {
        const [rows] = await db.query(
            'SELECT ruc, correo FROM clientes WHERE ruc = ? OR correo = ?',
            [ruc, correo]
        );
        return rows;
    },

    // CORREGIDO: Ahora genera e inserta la fecha actual local desde Node.js
    create: async (data) => {
        const { 
            ruc, razon_social, correo, direccion, celular, 
            contacto, distrito, provincia, departamento, zona, 
            creado_por 
        } = data;

        // Genera la fecha y hora local actual del servidor de Node.js
        const fecha_creacion = new Date(); 

        const [result] = await db.query(
            `INSERT INTO clientes 
            (ruc, razon_social, correo, direccion, celular, contacto, distrito, provincia, departamento, zona, creado_por, fecha_creacion) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
            [ruc, razon_social, correo, direccion, celular, contacto, distrito, provincia, departamento, zona, creado_por, fecha_creacion]
        );

        return result;
    },

    update: async (id, data) => {
        const { ruc, razon_social, correo, direccion, celular, contacto, distrito, provincia, departamento, zona } = data;

        const [result] = await db.query(
            'UPDATE clientes SET ruc = ?, razon_social = ?, correo = ?, direccion = ?, celular = ?, contacto = ?, distrito = ?, provincia = ?, departamento = ?, zona = ? WHERE id_cliente = ?',
            [ruc, razon_social, correo, direccion, celular, contacto, distrito, provincia, departamento, zona, id]
        );

        return result;
    },

    delete: async (id) => {
        const [result] = await db.query('DELETE FROM clientes WHERE id_cliente = ?', [id]);
        return result;
    }
};

export default Cliente;