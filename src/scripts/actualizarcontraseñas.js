const bcrypt = require('bcrypt');
const connection = require('../config/db'); // Importa la conexión a la base de datos

const saltRounds = 10; // Número de rondas de "salting" (a mayor número, más seguro, pero más lento)

const actualizarContraseñas = () => {
  const query = "SELECT * FROM usuario"; // Selecciona todos los usuarios
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener los usuarios:", err.message);
      return;
    }

    results.forEach((usuario) => {
      const contrasena = usuario.contrasena;

      // Encriptar la contraseña usando bcrypt
      bcrypt.hash(contrasena, saltRounds, (err, hash) => {
        if (err) {
          console.error("Error al encriptar la contraseña:", err.message);
          return;
        }

        // Actualizar la contraseña en la base de datos
        const updateQuery = "UPDATE usuario SET contrasena = ? WHERE id_usuario = ?";
        connection.query(updateQuery, [hash, usuario.id_usuario], (err, results) => {
          if (err) {
            console.error("Error al actualizar la contraseña del usuario:", err.message);
          } else {
            console.log(`Contraseña del usuario ${usuario.id_usuario} actualizada exitosamente.`);
          }
        });
      });
    });
  });
};

actualizarContraseñas(); // Ejecutar la función para actualizar las contraseñas
