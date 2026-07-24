import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../config/db.js';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    throw new Error('JWT_SECRET no está definido en el archivo .env');
}

// 1. Lógica para el login
export const login = async (req, res) => {
    const { dni, password } = req.body;
    const dniNormalizado = String(dni || '').trim();

    if (!/^\d{8,12}$/.test(dniNormalizado) || typeof password !== 'string' || password.length < 1 || password.length > 128) {
        return res.status(400).json({ error: 'DNI y contraseña son requeridos' });
    }

    try {
        // Usamos JOIN para traer el nombre del rol
        const query = `
            SELECT u.*, r.nombre_rol 
            FROM usuarios u 
            JOIN roles r ON u.id_rol = r.id_rol 
            WHERE u.dni = ? AND u.estado = 1`;

        const [results] = await pool.query(query, [dniNormalizado]);

        if (results.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const usuario = results[0];
        const isMatch = await bcrypt.compare(password, usuario.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // Incluimos el nombre_rol en el token
        const token = jwt.sign(
            { id_usuario: usuario.id_usuario, nombres: usuario.nombres, rol: usuario.nombre_rol },
            jwtSecret,
            { algorithm: 'HS256', expiresIn: '4h' }
        );

        return res.status(200).json({
            message: 'Inicio de sesión exitoso',
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                rol: usuario.nombre_rol, // Ahora viene de la tabla roles
            }
        });

    } catch (err) {
        console.error('Error en el proceso de login:', err.message);
        return res.status(500).json({ error: 'Error en el servidor' });
    }
};

// 2. Validar token
export const validateToken = async (req, res) => {
    let connection;
    try {
        // Obtenemos una conexión activa del pool
        connection = await pool.getConnection();

        const query = `
            SELECT u.id_usuario, u.nombres, u.apellidos, u.dni, r.nombre_rol 
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id_rol
            WHERE u.id_usuario = ?`;

        const [results] = await connection.query(query, [req.user.id_usuario]);

        if (results.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        return res.status(200).json({ usuario: results[0] });

    } catch (error) {
        console.error('Error en validateToken:', error.message);
        return res.status(500).json({ error: "Error en el servidor" });
    } finally {
        // SIEMPRE liberamos la conexión al pool
        if (connection) connection.release();
    }
};

// 4. Restablecer la contraseña (ajuste de nombre de tabla)
export const restablecerContrasena = async (req, res) => {
    const { token, nuevaContrasena } = req.body;

    if (!token || typeof nuevaContrasena !== 'string' || nuevaContrasena.length < 10 || nuevaContrasena.length > 128) {
        return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
        const { id_usuario } = decoded;

        const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

        // Corregido: 'usuarios' en lugar de 'usuario'
        const query = 'UPDATE usuarios SET password = ? WHERE id_usuario = ?';
        await pool.query(query, [hashedPassword, id_usuario]);

        return res.status(200).json({ message: 'Contraseña actualizada con éxito' });

    } catch (err) {
        console.error('Error al restablecer contraseña:', err.message);
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(400).json({ error: 'Token inválido o expirado' });
        }
        return res.status(500).json({ error: 'Error en el servidor' });
    }
};
