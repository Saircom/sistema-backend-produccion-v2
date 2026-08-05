import db from '../config/db.js';

try {
    const [columnas] = await db.execute(
        `SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'cotizaciones'
           AND COLUMN_NAME = 'movilidad'`
    );

    if (columnas.length === 0) {
        await db.query(
            `ALTER TABLE cotizaciones
             ADD COLUMN movilidad DECIMAL(12,2) NULL DEFAULT NULL AFTER centro_costo`
        );
        console.log('Columna agregada: cotizaciones.movilidad');
    } else {
        console.log('cotizaciones.movilidad ya existe.');
    }
} catch (error) {
    console.error(
        'No se pudo preparar el costo de movilidad en cotizaciones:',
        error?.sqlMessage || error?.message
    );
    process.exitCode = 1;
} finally {
    await db.end();
}
