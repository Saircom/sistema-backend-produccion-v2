import db from '../config/db.js';

const ejecutar = async () => {
    const [columnas] = await db.execute(
        `
        SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'cierre_responsable'
          AND COLUMN_NAME = 'firma'
        LIMIT 1
        `
    );

    if (columnas.length === 0) {
        throw new Error(
            'No existe la columna cierre_responsable.firma'
        );
    }

    const columna = columnas[0];
    const tiposSuficientes = new Set([
        'mediumtext',
        'longtext',
        'mediumblob',
        'longblob'
    ]);

    if (!tiposSuficientes.has(String(columna.DATA_TYPE).toLowerCase())) {
        await db.execute(
            `
            ALTER TABLE cierre_responsable
            MODIFY COLUMN firma MEDIUMTEXT NULL
            `
        );

        console.log(
            'Columna cierre_responsable.firma ampliada a MEDIUMTEXT.'
        );
    } else {
        console.log(
            `La columna firma ya tiene capacidad suficiente (${columna.DATA_TYPE}).`
        );
    }
};

try {
    await ejecutar();
    await db.end();
} catch (error) {
    console.error(
        'No se pudo ampliar la columna firma:',
        error?.sqlMessage
        || error?.message
        || error?.code
        || String(error)
    );
    await db.end();
    process.exitCode = 1;
}
