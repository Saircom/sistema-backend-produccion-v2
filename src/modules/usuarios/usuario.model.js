import db from '../../config/db.js';

export const UsuarioModels = {
    findCredentialsById: async id => {
        const [rows] = await db.execute('SELECT id_usuario, password FROM usuarios WHERE id_usuario = ? AND estado = 1 LIMIT 1', [id]);
        return rows[0] ?? null;
    },

    updateProfile: async (id, nombres, apellidos) => {
        const [result] = await db.execute('UPDATE usuarios SET nombres = ?, apellidos = ? WHERE id_usuario = ?', [nombres, apellidos, id]);
        return result.affectedRows;
    },

    updatePassword: async (id, hashedPassword) => {
        const [result] = await db.execute('UPDATE usuarios SET password = ? WHERE id_usuario = ?', [hashedPassword, id]);
        return result.affectedRows;
    },

    /**
     * Obtener todos los usuarios con su rol.
     * No devuelve la contraseña.
     */
    findAll: async () => {
        const [rows] = await db.query(`
            SELECT
                u.id_usuario,
                u.nombres,
                u.apellidos,
                u.dni,
                u.celular,
                u.correo,
                u.id_rol,
                u.estado,
                u.fecha_registro,
                r.nombre_rol
            FROM usuarios u
            LEFT JOIN roles r
                ON r.id_rol = u.id_rol
            ORDER BY
                u.nombres ASC,
                u.apellidos ASC
        `);

        return rows;
    },

    /**
     * Obtener únicamente técnicos activos.
     * Se utiliza en el módulo Planner.
     */
    findTecnicos: async () => {
        const [rows] = await db.query(`
            SELECT
                u.id_usuario,
                u.nombres,
                u.apellidos,
                u.dni,
                u.celular,
                u.correo,
                u.id_rol,
                u.estado,
                r.nombre_rol
            FROM usuarios u
            INNER JOIN roles r
                ON r.id_rol = u.id_rol
            WHERE UPPER(TRIM(r.nombre_rol)) = 'TECNICO'
              AND u.estado = 1
            ORDER BY
                u.nombres ASC,
                u.apellidos ASC
        `);

        return rows;
    },

    /**
     * Buscar usuario por ID.
     */
    findById: async (id) => {
        const [rows] = await db.query(
            `
            SELECT
                u.id_usuario,
                u.nombres,
                u.apellidos,
                u.dni,
                u.celular,
                u.correo,
                u.id_rol,
                u.estado,
                u.fecha_registro,
                r.nombre_rol
            FROM usuarios u
            LEFT JOIN roles r
                ON r.id_rol = u.id_rol
            WHERE u.id_usuario = ?
            LIMIT 1
            `,
            [id]
        );

        return rows[0] ?? null;
    },

    /**
     * Buscar usuario por DNI o correo.
     */
    findByDniOrEmail: async (dni, correo) => {
        const [rows] = await db.query(
            `
            SELECT
                id_usuario,
                dni,
                correo
            FROM usuarios
            WHERE dni = ?
               OR correo = ?
            `,
            [dni, correo]
        );

        return rows;
    },

    /**
     * Crear usuario.
     */
    create: async (data) => {
        const sql = `
            INSERT INTO usuarios (
                nombres,
                apellidos,
                dni,
                celular,
                correo,
                password,
                id_rol,
                estado
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            data.nombres,
            data.apellidos,
            data.dni,
            data.celular,
            data.correo,
            data.hashedPassword,
            data.id_rol,
            data.estado ?? 1
        ];

        const [result] = await db.execute(sql, values);

        return result.insertId;
    },

    /**
     * Obtener todos los roles.
     */
    findAllRoles: async () => {
        const [rows] = await db.query(`
            SELECT
                id_rol,
                nombre_rol
            FROM roles
            ORDER BY nombre_rol ASC
        `);

        return rows;
    },

    findRoleById: async id => {
        const [rows] = await db.execute(
            'SELECT id_rol, nombre_rol FROM roles WHERE id_rol = ? LIMIT 1',
            [id]
        );
        return rows[0] ?? null;
    },

    /**
     * Actualizar usuario.
     * Actualiza contraseña solamente cuando se recibe hashedPassword.
     */
    update: async (id, data) => {
        let sql;
        let values;

        if (data.hashedPassword) {
            sql = `
                UPDATE usuarios
                SET
                    nombres = ?,
                    apellidos = ?,
                    dni = ?,
                    celular = ?,
                    correo = ?,
                    password = ?,
                    id_rol = ?,
                    estado = ?
                WHERE id_usuario = ?
            `;

            values = [
                data.nombres,
                data.apellidos,
                data.dni,
                data.celular,
                data.correo,
                data.hashedPassword,
                data.id_rol,
                data.estado ?? 1,
                id
            ];
        } else {
            sql = `
                UPDATE usuarios
                SET
                    nombres = ?,
                    apellidos = ?,
                    dni = ?,
                    celular = ?,
                    correo = ?,
                    id_rol = ?,
                    estado = ?
                WHERE id_usuario = ?
            `;

            values = [
                data.nombres,
                data.apellidos,
                data.dni,
                data.celular,
                data.correo,
                data.id_rol,
                data.estado ?? 1,
                id
            ];
        }

        const [result] = await db.execute(sql, values);

        return result.affectedRows;
    },

    /**
     * Cambiar solamente el estado del usuario.
     */
    updateEstado: async (id, estado) => {
        const [result] = await db.execute(
            `
            UPDATE usuarios
            SET estado = ?
            WHERE id_usuario = ?
            `,
            [estado, id]
        );

        return result.affectedRows;
    },

    /**
     * Eliminar usuario físicamente.
     */
    delete: async (id) => {
        const [result] = await db.execute(
            `
            DELETE FROM usuarios
            WHERE id_usuario = ?
            `,
            [id]
        );

        return result.affectedRows;
    }
};
