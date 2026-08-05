import db from '../config/db.js';

const ejecutar = async () => {
    const [columnas] = await db.execute(`
        SELECT COLUMN_TYPE, IS_NULLABLE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'ordenes_trabajo'
          AND COLUMN_NAME = 'id_movilidad'
        LIMIT 1
    `);
    if (columnas.length === 0) throw new Error('No existe ordenes_trabajo.id_movilidad');
    if (columnas[0].IS_NULLABLE === 'YES') {
        console.log('ordenes_trabajo.id_movilidad ya permite valores NULL.');
        return;
    }
    await db.query(
        `ALTER TABLE ordenes_trabajo MODIFY COLUMN id_movilidad ${columnas[0].COLUMN_TYPE} NULL`
    );
    console.log('ordenes_trabajo.id_movilidad ahora permite valores NULL.');
};

try {
    await ejecutar();
    await db.end();
} catch (error) {
    console.error('No se pudo habilitar la OT sin movilidad:', error?.sqlMessage || error?.message || String(error));
    await db.end();
    process.exitCode = 1;
}
