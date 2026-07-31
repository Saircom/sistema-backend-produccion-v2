import db from '../config/db.js';

const ejecutar = async () => {
    const [columnas] = await db.execute(
        `
        SELECT COLUMN_TYPE, IS_NULLABLE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'ot_detalles'
          AND COLUMN_NAME = 'id_equipo'
        LIMIT 1
        `
    );

    if (columnas.length === 0) {
        throw new Error('No existe la columna ot_detalles.id_equipo');
    }

    const columna = columnas[0];

    if (columna.IS_NULLABLE === 'YES') {
        console.log('ot_detalles.id_equipo ya permite valores NULL.');
        return;
    }

    // COLUMN_TYPE proviene de information_schema y conserva atributos
    // importantes del tipo actual, por ejemplo INT UNSIGNED.
    await db.query(
        `ALTER TABLE ot_detalles MODIFY COLUMN id_equipo ${columna.COLUMN_TYPE} NULL`
    );

    const [verificacion] = await db.execute(
        `
        SELECT IS_NULLABLE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'ot_detalles'
          AND COLUMN_NAME = 'id_equipo'
        LIMIT 1
        `
    );

    if (verificacion[0]?.IS_NULLABLE !== 'YES') {
        throw new Error('La columna ot_detalles.id_equipo continúa siendo obligatoria');
    }

    console.log('ot_detalles.id_equipo ahora permite valores NULL.');
};

try {
    await ejecutar();
    await db.end();
} catch (error) {
    console.error(
        'No se pudo habilitar la creación de OT sin equipo:',
        error?.sqlMessage
        || error?.message
        || error?.code
        || String(error)
    );
    await db.end();
    process.exitCode = 1;
}
