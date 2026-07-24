const connection = require('../config/db'); // Importa la conexión a la base de datos

// Obteconst { io } = require('../server'); // Importar `io` del servidor
exports.obtenerNotificaciones = (req, res) => {
    const id_usuario = req.user?.id_usuario; // Asegurar que se obtiene el ID del usuario autenticado

    if (!id_usuario) {
        return res.status(401).json({ error: 'No autorizado. ID de usuario no proporcionado' });
    }

    const query = 'SELECT * FROM notificaciones WHERE id_usuario = ? ORDER BY fecha DESC';
    
    connection.query(query, [id_usuario], (err, results) => {
        if (err) {
            console.error('Error al obtener notificaciones:', err);
            return res.status(500).json({ error: 'Error al obtener notificaciones' });
        }

        res.status(200).json(results); // 📌 Devolver SOLO el array de notificaciones
    });
};



// Insertar una nueva notificación
exports.insertarNotificacion = (mensaje, usuario_id) => {
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO notificaciones (mensaje, usuario_id) VALUES (?, ?)';
        connection.query(query, [mensaje, usuario_id], (err, result) => {
            if (err) {
                console.error('Error al insertar la notificación:', err);
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

// Marcar una notificación como leída
exports.marcarComoLeida = (req, res) => {
    const { id_notificacion } = req.params;

    const query = `UPDATE notificaciones SET estado = 'leida' WHERE id_notificacion = ?`;
    connection.query(query, [id_notificacion], (err, result) => {
        if (err) {
            console.error('Error al marcar la notificación como leída:', err);
            return res.status(500).send('Error al marcar la notificación como leída');
        }
        res.status(200).send('Notificación marcada como leída');
    });
};
