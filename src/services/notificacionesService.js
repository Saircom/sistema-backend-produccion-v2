const connection = require('../config/db');

const enviarNotificacionAdmin = (id_usuario, id_servicio) => {
    if (!id_usuario || !id_servicio) {
        console.error("Error: id_usuario o id_servicio no proporcionado");
        return;
    }

    console.log(`Buscando datos del usuario con ID: ${id_usuario}`);

    connection.query("SELECT nombres, apellidos FROM usuario WHERE id_usuario = ?", [id_usuario], (err, result) => {
        if (err) {
            console.error("Error al obtener los datos del usuario:", err);
            return;
        }

        if (result.length === 0) {
            console.error("Usuario no encontrado en la base de datos");
            return;
        }

        const { nombres, apellidos } = result[0];
        const mensaje = `El técnico ${nombres} ${apellidos} acaba de registrar un servicio técnico (ID: ${id_servicio})`;

        console.log(`Mensaje de notificación: ${mensaje}`);

        connection.query("SELECT id_usuario FROM usuario WHERE rol = 'admin'", (err, admins) => {
            if (err) {
                console.error("Error al obtener administradores:", err);
                return;
            }

            if (admins.length === 0) {
                console.log("No hay administradores registrados, no se enviará la notificación.");
                return;
            }

            console.log(`Administradores encontrados: ${admins.length}`);

            const adminIds = admins.map(admin => admin.id_usuario);
            const queryCheck = `SELECT id_usuario FROM notificaciones WHERE id_usuario IN (?) AND id_servicio = ? AND mensaje = ?`;

            connection.query(queryCheck, [adminIds, id_servicio, mensaje], (err, existingNotifications) => {
                if (err) {
                    console.error("Error al verificar notificaciones existentes:", err);
                    return;
                }

                const existingAdminIds = existingNotifications.map(n => n.id_usuario);
                const adminsToNotify = admins.filter(admin => !existingAdminIds.includes(admin.id_usuario));

                if (adminsToNotify.length === 0) {
                    console.log("Todas las notificaciones ya existen, no se insertará ninguna nueva.");
                    return;
                }

                const values = adminsToNotify.map(admin => [admin.id_usuario, id_servicio, mensaje, 'info', 'no_leida']);

                const queryInsert = `INSERT INTO notificaciones (id_usuario, id_servicio, mensaje, tipo, estado, fecha) VALUES ?`;

                connection.query(queryInsert, [values.map(v => [...v, new Date()])], (err) => {
                    if (err) {
                        console.error("Error al insertar notificaciones:", err);
                    } else {
                        console.log("Notificaciones insertadas correctamente.");
                        adminsToNotify.forEach(admin => {
                            console.log(`Notificación enviada al administrador con ID ${admin.id_usuario}`);
                        });
                    }
                });
            });
        });
    });
};

module.exports = { enviarNotificacionAdmin };
