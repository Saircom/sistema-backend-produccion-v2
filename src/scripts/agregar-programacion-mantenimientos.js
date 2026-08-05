import db from '../config/db.js';

const columnas = [
    ['proxima_fecha_mantenimiento', 'DATE NULL AFTER observaciones'],
    ['proximo_kilometraje', 'INT NULL AFTER proxima_fecha_mantenimiento'],
    ['dias_alerta', 'INT NOT NULL DEFAULT 30 AFTER proximo_kilometraje'],
    ['kilometros_alerta', 'INT NOT NULL DEFAULT 500 AFTER dias_alerta']
];

try {
    for (const [nombre, definicion] of columnas) {
        const [existentes] = await db.execute(
            `SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'mantenimientos'
               AND COLUMN_NAME = ?`,
            [nombre]
        );

        if (existentes.length === 0) {
            await db.query(`ALTER TABLE mantenimientos ADD COLUMN ${nombre} ${definicion}`);
            console.log(`Columna agregada: mantenimientos.${nombre}`);
        }
    }
} catch (error) {
    console.error('No se pudo preparar la programacion de mantenimientos:', error?.sqlMessage || error?.message);
    process.exitCode = 1;
} finally {
    await db.end();
}
