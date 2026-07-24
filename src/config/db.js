// src/config/database.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 👇 AGREGA ESTO
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: '-05:00'
});

// 👇 LA SOLUCIÓN CORRECTA: Configuramos la zona horaria de la sesión cada vez que se abre una conexión
pool.on('connection', (connection) => {
  connection.promise().query("SET time_zone = '-05:00'")
    .catch(err => console.error('❌ Error al setear la zona horaria de la sesión:', err.message));
});

// Exportamos una función limpia para verificar la salud de la conexión desde el arranque del servidor
export const checkDatabaseConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('📦 Conexión a la Base de Datos establecida correctamente (Zona Horaria: -05:00)');
    connection.release();
    return true;
  } catch (err) {
    console.error('❌ Error crítico al conectar al pool de la base de datos:', err.message);
    throw err;
  }
};

export default pool;