import db from '../config/db.js';

const FK_DUPLICADA = 'fk_informes_ot_detalle';

const ejecutar = async () => {
    const [restricciones] = await db.execute(
        `
        SELECT CONSTRAINT_NAME
        FROM information_schema.REFERENTIAL_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = 'informes_servicio'
          AND REFERENCED_TABLE_NAME = 'ot_detalles'
          AND CONSTRAINT_NAME = ?
        `,
        [FK_DUPLICADA]
    );

    if (restricciones.length === 0) {
        console.log('La clave foranea duplicada ya no existe.');
        return;
    }

    await db.query(
        `ALTER TABLE informes_servicio DROP FOREIGN KEY ${FK_DUPLICADA}`
    );

    console.log(`Clave foranea duplicada eliminada: ${FK_DUPLICADA}.`);
};

try {
    await ejecutar();
    await db.end();
} catch (error) {
    console.error(
        'No se pudo eliminar la clave foranea duplicada:',
        error?.sqlMessage
        || error?.message
        || error?.code
        || String(error)
    );
    await db.end();
    process.exitCode = 1;
}
