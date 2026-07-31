// src/modules/informes/informes.repository.js
import db from '../../config/db.js';

/**
 * Campos que nunca deben insertarse directamente
 * dentro de las tablas de secciones.
 */
const CAMPOS_PROTEGIDOS = new Set([
    'id',
    'id_informe',
    'id_ot',
    'id_ot_detalle',
    'id_equipo',
    'id_tecnico',
    'idTecnico',
    'idInforme',
    'idOt',
    'idOtDetalle',
    'idEquipo',
    'orden',
    'cliente',
    'equipo',
    'movilidad',
    'tiempos',
    'servicios',
    'historial',
    'imagenes_servicio',
    'servicio_responsable'
]);

/**
 * Convierte un arreglo en su primer registro.
 */
const obtenerPrimerRegistro = (valor) => {
    if (Array.isArray(valor)) {
        return valor[0] ?? null;
    }

    if (valor && typeof valor === 'object') {
        return valor;
    }

    return null;
};

/**
 * Elimina valores undefined y campos que no deben
 * insertarse en las tablas hijas.
 */
const limpiarObjeto = (objeto = {}) => {
    if (
        !objeto ||
        typeof objeto !== 'object' ||
        Array.isArray(objeto)
    ) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(objeto).filter(
            ([clave, valor]) =>
                valor !== undefined &&
                !CAMPOS_PROTEGIDOS.has(clave)
        )
    );
};

/**
 * Guarda una sección que tiene una sola fila por informe.
 *
 * La tabla debe tener un índice UNIQUE sobre id_informe.
 *
 * Los nombres de las tablas nunca vienen del frontend;
 * solamente se utilizan nombres definidos internamente.
 */
const guardarSeccionUnica = async (
    connection,
    tabla,
    idInforme,
    datos
) => {
    const registroOriginal =
        obtenerPrimerRegistro(datos);

    if (!registroOriginal) {
        return null;
    }

    const datosLimpios =
        limpiarObjeto(registroOriginal);

    if (Object.keys(datosLimpios).length === 0) {
        return null;
    }

    const registro = {
        id_informe: idInforme,
        ...datosLimpios
    };

    const columnasActualizables =
        Object.keys(datosLimpios);

    const actualizaciones =
        columnasActualizables
            .map(
                (columna) =>
                    `\`${columna}\` = VALUES(\`${columna}\`)`
            )
            .join(', ');

    const sql = `
        INSERT INTO \`${tabla}\`
        SET ?

        ON DUPLICATE KEY UPDATE
            ${actualizaciones}
    `;

    const [resultado] = await connection.query(
        sql,
        [registro]
    );

    return resultado;
};

/**
 * Guarda una colección de filas.
 *
 * Útil cuando una sección puede tener varios registros,
 * como imágenes o listas de filtros.
 */
const reemplazarColeccion = async (
    connection,
    tabla,
    idInforme,
    registros
) => {
    if (!Array.isArray(registros)) {
        return [];
    }

    await connection.execute(
        `
        DELETE FROM \`${tabla}\`
        WHERE id_informe = ?
        `,
        [idInforme]
    );

    const resultados = [];

    for (const item of registros) {
        const datosLimpios = limpiarObjeto(item);

        if (Object.keys(datosLimpios).length === 0) {
            continue;
        }

        const registro = {
            id_informe: idInforme,
            ...datosLimpios
        };

        const [resultado] =
            await connection.query(
                `
                INSERT INTO \`${tabla}\`
                SET ?
                `,
                [registro]
            );

        resultados.push({
            insertId: resultado.insertId
        });
    }

    return resultados;
};

export const informesRepository = {
    /**
     * Obtiene los datos principales de un detalle OT.
     *
     * Si se proporciona idTecnico, valida que la OT
     * esté asignada al técnico indicado.
     */
    async obtenerDatosDetalle(
        idOtDetalle,
        idTecnico = null
    ) {
        const parametros = [
            Number(idOtDetalle)
        ];

        let condicionTecnico = '';

        if (idTecnico) {
            condicionTecnico = `
                AND ot.id_tecnico_responsable = ?
            `;

            parametros.push(Number(idTecnico));
        }

        const sql = `
            SELECT
                od.id_ot_detalle,
                od.id_ot,
                od.id_equipo,
                od.estado_equipo,

                ot.id_cotizacion,
                ot.id_tecnico_responsable,
                ot.id_movilidad,
                ot.fecha_programada,
                ot.estado AS estado_ot,
                ot.id_usuario_creador,

                cot.numero_cotizacion,
                cot.tipo_pago,
                cot.centro_costo,
                cot.nota,
                cot.fecha_registro AS fecha_cotizacion,

                cli.id_cliente,
                cli.razon_social,
                cli.ruc,
                cli.direccion AS direccion_cliente,
                cli.celular,
                cli.contacto,
                cli.distrito,
                cli.provincia,
                cli.departamento,

                eq.tipo_equipo,
                eq.id_marca,
                eq.modelo,
                eq.serie,
                eq.sede,
                eq.direccion AS direccion_equipo,
                eq.codigo_interno,
                eq.encargado_equipo,

                mar.nombre AS marca,

                CONCAT_WS(
                    ' ',
                    tec.nombres,
                    tec.apellidos
                ) AS tecnico_responsable,

                mov.placa AS placa_movilidad,
                mov.marca AS marca_movilidad,
                mov.modelo AS modelo_movilidad,
                mov.tipo_vehiculo,

             
                st.fecha_hora_llegada,
                st.fecha_hora_inicio,
                st.fecha_hora_fin

            FROM ot_detalles od

            INNER JOIN ordenes_trabajo ot
                ON ot.id_ot = od.id_ot

            INNER JOIN cotizaciones cot
                ON cot.id_cotizacion =
                   ot.id_cotizacion

            INNER JOIN clientes cli
                ON cli.id_cliente =
                   cot.id_cliente

            INNER JOIN equipos eq
                ON eq.id_equipo =
                   od.id_equipo

            LEFT JOIN marcas mar
                ON mar.id_marca =
                   eq.id_marca

            LEFT JOIN usuarios tec
                ON tec.id_usuario =
                   ot.id_tecnico_responsable

            LEFT JOIN movilidades mov
                ON mov.id_movilidad =
                   ot.id_movilidad

            LEFT JOIN servicio_tiempos st
                ON st.id_ot_detalle =
                   od.id_ot_detalle

            WHERE od.id_ot_detalle = ?
            ${condicionTecnico}

            LIMIT 1
        `;

        const [rows] = await db.execute(
            sql,
            parametros
        );

        return rows[0] ?? null;
    },

    /**
     * Busca un informe mediante id_ot_detalle.
     */
    async buscarInformePorOtDetalle(
        idOtDetalle
    ) {
        const [rows] = await db.execute(
            `
            SELECT
                id_informe,
                id_ot_detalle,
                fecha_finalizacion
            FROM informes_servicio
            WHERE id_ot_detalle = ?
            LIMIT 1
            `,
            [Number(idOtDetalle)]
        );

        return rows[0] ?? null;
    },

    /**s
     * Busca un informe mediante id_informe.
     */
    async buscarInformePorId(idInforme) {
        const [rows] = await db.execute(
            `
            SELECT
                id_informe,
                id_ot_detalle,
                fecha_finalizacion
            FROM informes_servicio
            WHERE id_informe = ?
            LIMIT 1
            `,
            [Number(idInforme)]
        );

        return rows[0] ?? null;
    },

    /**
     * Obtiene o crea un informe para un detalle OT.
     *
     * informes_servicio.id_ot_detalle debe ser UNIQUE.
     */
    async obtenerOCrearInforme(idOtDetalle) {
        const connection =
            await db.getConnection();

        try {
            await connection.beginTransaction();

            const detalleId =
                Number(idOtDetalle);

            const [detalles] =
                await connection.execute(
                    `
                    SELECT id_ot_detalle
                    FROM ot_detalles
                    WHERE id_ot_detalle = ?
                    LIMIT 1
                    FOR UPDATE
                    `,
                    [detalleId]
                );

            if (detalles.length === 0) {
                throw new Error(
                    'El detalle de la Orden de Trabajo no existe'
                );
            }

            const [informeExistente] = await connection.execute(
                `SELECT id_informe
                 FROM informes_servicio
                 WHERE id_ot_detalle = ?
                 LIMIT 1`,
                [detalleId]
            );

            if (informeExistente.length === 0) {
                await connection.execute(
                    `INSERT INTO informes_servicio (
                        id_ot_detalle,
                        fecha_finalizacion
                    ) VALUES (?, NULL)`,
                    [detalleId]
                );
            }

            const [informes] =
                await connection.execute(
                    `
                    SELECT
                        id_informe,
                        id_ot_detalle,
                        fecha_finalizacion
                    FROM informes_servicio
                    WHERE id_ot_detalle = ?
                    LIMIT 1
                    `,
                    [detalleId]
                );

            if (informes.length === 0) {
                throw new Error(
                    'No se pudo crear u obtener el informe'
                );
            }

            await connection.commit();

            return informes[0];
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Obtiene los servicios asignados al detalle OT.
     */
    async obtenerServicios(idOtDetalle) {
        const sql = `
            SELECT
                ods.id_ot_detalle_servicio,
                ods.id_ot_detalle,
                ods.id_subtipo_servicio,
                ods.estado,
                ods.observacion,

                ss.id_tipo_servicio,
                ss.codigo AS codigo_subtipo,
                ss.nombre AS nombre_subtipo,

                ts.codigo AS codigo_tipo_servicio,
                ts.nombre AS nombre_tipo_servicio

            FROM ot_detalle_servicios ods

            INNER JOIN subtipo_servicio ss
                ON ss.id_subtipo_servicio =
                   ods.id_subtipo_servicio

            INNER JOIN tipo_servicio ts
                ON ts.id_tipo_servicio =
                   ss.id_tipo_servicio

            WHERE ods.id_ot_detalle = ?

            ORDER BY
                ods.id_ot_detalle_servicio ASC
        `;

        const [rows] = await db.execute(
            sql,
            [Number(idOtDetalle)]
        );

        return rows;
    },

    async obtenerLecturasCompresor(idInforme) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM lecturas_compresor
            WHERE id_informe = ?
            ORDER BY 1 ASC
            `,
            [Number(idInforme)]
        );

        return rows;
    },

    async obtenerLecturasSecador(idInforme) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM lecturas_secador
            WHERE id_informe = ?
            ORDER BY 1 ASC
            `,
            [Number(idInforme)]
        );

        return rows;
    },

    async obtenerLecturasCombustion(idInforme) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM lecturas_combustion
            WHERE id_informe = ?
            ORDER BY 1 ASC
            `,
            [Number(idInforme)]
        );

        return rows;
    },

    async obtenerVoltajeAmperaje(idInforme) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM voltaje_amperaje
            WHERE id_informe = ?
            ORDER BY 1 ASC
            `,
            [Number(idInforme)]
        );

        return rows;
    },

    async obtenerFiltrosComponentes(idInforme) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM detalle_filtros_componentes
            WHERE id_informe = ?
            ORDER BY 1 ASC
            `,
            [Number(idInforme)]
        );

        return rows;
    },

    async obtenerInformeTecnico(idInforme) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM detalle_informe
            WHERE id_informe = ?
            LIMIT 1
            `,
            [Number(idInforme)]
        );

        return rows[0] ?? null;
    },

    async obtenerImagenes(idInforme) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM imagenes_informe
            WHERE id_informe = ?
            ORDER BY 1 ASC
            `,
            [Number(idInforme)]
        );

        return rows;
    },

    async obtenerResponsable(idInforme) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM cierre_responsable
            WHERE id_informe = ?
            LIMIT 1
            `,
            [Number(idInforme)]
        );

        return rows[0] ?? null;
    },

    /**
     * Historial del equipo.
     *
     * Se usa id_equipo para evitar depender de series
     * vacías o duplicadas.
     */
    async obtenerHistorialPorEquipo(
        idEquipo,
        idOtDetalleActual = null
    ) {
        const equipoId = Number(idEquipo);

        const detalleActual =
            idOtDetalleActual
                ? Number(idOtDetalleActual)
                : null;

        const sql = `
            SELECT
                od.id_ot_detalle,
                od.id_ot,
                od.id_equipo,
                od.estado_equipo,

                ot.fecha_programada,
                ot.estado AS estado_ot,

                cot.id_cotizacion,
                cot.numero_cotizacion,
                cot.tipo_pago,

                cli.id_cliente,
                cli.razon_social,
                cli.ruc,

                inf.id_informe,
                inf.fecha_finalizacion,

                eq.tipo_equipo,
                eq.modelo,
                eq.serie,

                mar.nombre AS marca,

                GROUP_CONCAT(
                    DISTINCT CONCAT(
                        ts.nombre,
                        ' - ',
                        ss.nombre
                    )
                    ORDER BY
                        ts.nombre,
                        ss.nombre
                    SEPARATOR ', '
                ) AS servicios_realizados

            FROM ot_detalles od

            INNER JOIN ordenes_trabajo ot
                ON ot.id_ot = od.id_ot

            INNER JOIN cotizaciones cot
                ON cot.id_cotizacion =
                   ot.id_cotizacion

            INNER JOIN clientes cli
                ON cli.id_cliente =
                   cot.id_cliente

            INNER JOIN equipos eq
                ON eq.id_equipo =
                   od.id_equipo

            LEFT JOIN marcas mar
                ON mar.id_marca =
                   eq.id_marca

            LEFT JOIN informes_servicio inf
                ON inf.id_ot_detalle =
                   od.id_ot_detalle

            LEFT JOIN ot_detalle_servicios ods
                ON ods.id_ot_detalle =
                   od.id_ot_detalle

            LEFT JOIN subtipo_servicio ss
                ON ss.id_subtipo_servicio =
                   ods.id_subtipo_servicio

            LEFT JOIN tipo_servicio ts
                ON ts.id_tipo_servicio =
                   ss.id_tipo_servicio
            WHERE od.id_equipo = ?
              AND (
                    ? IS NULL
                    OR od.id_ot_detalle <> ?
              )

            GROUP BY
                od.id_ot_detalle,
                od.id_ot,
                od.id_equipo,
                od.estado_equipo,

                ot.fecha_programada,
                ot.estado,

                cot.id_cotizacion,
                cot.numero_cotizacion,
                cot.tipo_pago,

                cli.id_cliente,
                cli.razon_social,
                cli.ruc,

                inf.id_informe,
                inf.fecha_finalizacion,

                eq.tipo_equipo,
                eq.modelo,
                eq.serie,

                mar.nombre

            ORDER BY
                ot.fecha_programada DESC,
                od.id_ot_detalle DESC
        `;

        const [rows] = await db.execute(
            sql,
            [
                equipoId,
                detalleActual,
                detalleActual
            ]
        );

        return rows;
    },

    /**
     * Obtiene información general mediante id_informe.
     */
    async obtenerInformePorId(idInforme) {
        const sql = `
            SELECT
                inf.id_informe,
                inf.id_ot_detalle,
                inf.fecha_finalizacion,

                od.id_ot,
                od.id_equipo,
                od.estado_equipo,

                ot.fecha_programada,
                ot.estado AS estado_ot,
                ot.id_tecnico_responsable,

                cot.numero_cotizacion,
                cot.tipo_pago,
                cot.centro_costo,
                cot.nota,

                cli.id_cliente,
                cli.razon_social,
                cli.ruc,
                cli.direccion AS direccion_cliente,
                cli.contacto,
                cli.celular,

                eq.tipo_equipo,
                eq.modelo,
                eq.serie,
                eq.sede,
                eq.direccion AS direccion_equipo,
                eq.codigo_interno,
                eq.encargado_equipo,

                mar.nombre AS marca,

                CONCAT_WS(
                    ' ',
                    tec.nombres,
                    tec.apellidos
                ) AS tecnico_responsable

            FROM informes_servicio inf

            INNER JOIN ot_detalles od
                ON od.id_ot_detalle =
                   inf.id_ot_detalle

            INNER JOIN ordenes_trabajo ot
                ON ot.id_ot = od.id_ot

            INNER JOIN cotizaciones cot
                ON cot.id_cotizacion =
                   ot.id_cotizacion

            INNER JOIN clientes cli
                ON cli.id_cliente =
                   cot.id_cliente

            INNER JOIN equipos eq
                ON eq.id_equipo =
                   od.id_equipo

            LEFT JOIN marcas mar
                ON mar.id_marca =
                   eq.id_marca

            LEFT JOIN usuarios tec
                ON tec.id_usuario =
                   ot.id_tecnico_responsable

            WHERE inf.id_informe = ?

            LIMIT 1
        `;

        const [rows] = await db.execute(
            sql,
            [Number(idInforme)]
        );

        return rows[0] ?? null;
    },

    /**
     * Obtiene una entrada histórica completa.
     */
    async obtenerHistorialDetalle(idInforme) {
        const informe =
            await this.obtenerInformePorId(
                idInforme
            );

        if (!informe) {
            return null;
        }

        // DetalleInforme.jsx consume la misma estructura anidada que
        // getByOtDetalle: informe, orden, cliente, equipo, tiempos y secciones.
        // La respuesta plana anterior no incluía data.informe.id_informe.
        return this.getByOtDetalle(
            informe.id_ot_detalle
        );
    },

    /**
     * Carga toda la información necesaria para
     * DetalleInforme.jsx.
     */
    async obtenerTecnicosApoyo(idOtDetalle) {
        const [rows] = await db.execute(
            `SELECT
                u.id_usuario,
                u.nombres,
                u.apellidos
             FROM ot_detalles od
             INNER JOIN ordenes_trabajo ot ON ot.id_ot = od.id_ot
             INNER JOIN asignaciones_tecnicos at ON at.id_ot = ot.id_ot
             INNER JOIN usuarios u ON u.id_usuario = at.id_usuario
             WHERE od.id_ot_detalle = ?
               AND at.id_usuario <> ot.id_tecnico_responsable
             ORDER BY u.nombres, u.apellidos`,
            [Number(idOtDetalle)]
        );
        return rows;
    },

    async getByOtDetalle(
        idOtDetalle,
        idTecnico = null
    ) {
        const detalle =
            await this.obtenerDatosDetalle(
                idOtDetalle,
                idTecnico
            );

        if (!detalle) {
            return null;
        }

        const informe =
            await this.obtenerOCrearInforme(
                idOtDetalle
            );

        const [
            servicios,
            lecturasCompresor,
            lecturasSecador,
            lecturasCombustion,
            voltajeAmperaje,
            filtrosComponentes,
            informeTecnico,
            imagenes,
            responsable,
            tecnicosAdicionales,
            historial
        ] = await Promise.all([
            this.obtenerServicios(
                idOtDetalle
            ),

            this.obtenerLecturasCompresor(
                informe.id_informe
            ),

            this.obtenerLecturasSecador(
                informe.id_informe
            ),

            this.obtenerLecturasCombustion(
                informe.id_informe
            ),

            this.obtenerVoltajeAmperaje(
                informe.id_informe
            ),

            this.obtenerFiltrosComponentes(
                informe.id_informe
            ),

            this.obtenerInformeTecnico(
                informe.id_informe
            ),

            this.obtenerImagenes(
                informe.id_informe
            ),

            this.obtenerResponsable(
                informe.id_informe
            ),

            this.obtenerTecnicosApoyo(
                idOtDetalle
            ),

            this.obtenerHistorialPorEquipo(
                detalle.id_equipo,
                detalle.id_ot_detalle
            )
        ]);

        return {
            id_ot_detalle:
                detalle.id_ot_detalle,

            id_ot:
                detalle.id_ot,

            id_equipo:
                detalle.id_equipo,

            estado_equipo:
                detalle.estado_equipo,

            orden: {
                id_ot:
                    detalle.id_ot,

                id_cotizacion:
                    detalle.id_cotizacion,

                numero_cotizacion:
                    detalle.numero_cotizacion,

                fecha_programada:
                    detalle.fecha_programada,

                estado:
                    detalle.estado_ot,

                tipo_pago:
                    detalle.tipo_pago,

                centro_costo:
                    detalle.centro_costo,

                nota:
                    detalle.nota,

                id_tecnico_responsable:
                    detalle.id_tecnico_responsable,

                tecnico_responsable:
                    detalle.tecnico_responsable
            },

            cliente: {
                id_cliente:
                    detalle.id_cliente,

                razon_social:
                    detalle.razon_social,

                ruc:
                    detalle.ruc,

                direccion:
                    detalle.direccion_cliente,

                celular:
                    detalle.celular,

                contacto:
                    detalle.contacto,

                distrito:
                    detalle.distrito,

                provincia:
                    detalle.provincia,

                departamento:
                    detalle.departamento
            },

            equipo: {
                id_equipo:
                    detalle.id_equipo,

                tipo_equipo:
                    detalle.tipo_equipo,

                id_marca:
                    detalle.id_marca,

                marca:
                    detalle.marca,

                modelo:
                    detalle.modelo,

                serie:
                    detalle.serie,

                sede:
                    detalle.sede,

                direccion:
                    detalle.direccion_equipo,

                codigo_interno:
                    detalle.codigo_interno,

                encargado_equipo:
                    detalle.encargado_equipo
            },

            movilidad: {
                id_movilidad:
                    detalle.id_movilidad,

                placa:
                    detalle.placa_movilidad,

                marca:
                    detalle.marca_movilidad,

                modelo:
                    detalle.modelo_movilidad,

                tipo_vehiculo:
                    detalle.tipo_vehiculo
            },

            tiempos: {
                estado_actual:
                    detalle.estado_actual,

                fecha_hora_programada:
                    detalle.fecha_programada,

                fecha_hora_llegada:
                    detalle.fecha_hora_llegada,

                fecha_hora_inicio:
                    detalle.fecha_hora_inicio,

                fecha_hora_fin:
                    detalle.fecha_hora_fin
            },

            informe,

            servicios,

            lecturas_compresor:
                lecturasCompresor,

            lecturas_secador:
                lecturasSecador,

            lecturas_combustion:
                lecturasCombustion,

            voltaje_amperaje:
                voltajeAmperaje,

            filtros_y_componentes:
                filtrosComponentes,

            detalle_informe:
                informeTecnico,

            imagenes_servicio:
                imagenes,

            servicio_responsable:
                responsable,

            tecnicos_adicionales:
                tecnicosAdicionales,

            historial
        };
    },

    /**
     * Guarda o actualiza todas las secciones del informe.
     */
    async guardarInforme(idOtDetalle, payload = {}, idTecnico = null) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const detalleId = Number(idOtDetalle);
            const tecnicoId = idTecnico ? Number(idTecnico) : null;

            if (!Number.isInteger(detalleId) || detalleId <= 0) {
                const error = new Error('El ID del detalle de la OT no es válido');
                error.statusCode = 400;
                throw error;
            }

            if (idTecnico && (!Number.isInteger(tecnicoId) || tecnicoId <= 0)) {
                const error = new Error('El ID del técnico no es válido');
                error.statusCode = 400;
                throw error;
            }

            const parametros = [detalleId];
            const condicionTecnico = tecnicoId
                ? 'AND ot.id_tecnico_responsable = ?'
                : '';

            if (tecnicoId) parametros.push(tecnicoId);

            const [detalles] = await connection.execute(
                `
            SELECT
                od.id_ot_detalle,
                od.id_ot,
                od.id_equipo,
                od.estado_equipo
            FROM ot_detalles od
            INNER JOIN ordenes_trabajo ot
                ON ot.id_ot = od.id_ot
            WHERE od.id_ot_detalle = ?
            ${condicionTecnico}
            LIMIT 1
            FOR UPDATE
            `,
                parametros
            );

            if (detalles.length === 0) {
                const error = new Error(
                    tecnicoId
                        ? 'El detalle no existe o no pertenece al técnico'
                        : 'El detalle de la Orden de Trabajo no existe'
                );
                error.statusCode = 404;
                throw error;
            }

            const [informeExistente] = await connection.execute(
                `SELECT id_informe
                 FROM informes_servicio
                 WHERE id_ot_detalle = ?
                 LIMIT 1`,
                [detalleId]
            );

            if (informeExistente.length === 0) {
                await connection.execute(
                    `INSERT INTO informes_servicio (
                        id_ot_detalle,
                        fecha_finalizacion
                    ) VALUES (?, NULL)`,
                    [detalleId]
                );
            }

            const [informes] = await connection.execute(
                `
            SELECT
                id_informe,
                id_ot_detalle,
                fecha_finalizacion
            FROM informes_servicio
            WHERE id_ot_detalle = ?
            LIMIT 1
            FOR UPDATE
            `,
                [detalleId]
            );

            if (informes.length === 0) {
                throw new Error('No se pudo crear u obtener el informe');
            }

            const idInforme = Number(informes[0].id_informe);

            if (!Number.isInteger(idInforme) || idInforme <= 0) {
                throw new Error('El ID del informe no es válido');
            }

            if (payload.lecturas_compresor !== undefined) {
                await guardarSeccionUnica(
                    connection,
                    'lecturas_compresor',
                    idInforme,
                    payload.lecturas_compresor
                );
            }

            if (payload.lecturas_secador !== undefined) {
                await guardarSeccionUnica(
                    connection,
                    'lecturas_secador',
                    idInforme,
                    payload.lecturas_secador
                );
            }

            if (payload.lecturas_combustion !== undefined) {
                const datosCombustion = limpiarObjeto(
                    obtenerPrimerRegistro(payload.lecturas_combustion)
                );

                if (Object.keys(datosCombustion).length > 0) {
                    await connection.execute(
                        'DELETE FROM lecturas_combustion WHERE id_informe = ?',
                        [idInforme]
                    );
                    await connection.query(
                        'INSERT INTO lecturas_combustion SET ?',
                        [{ id_informe: idInforme, ...datosCombustion }]
                    );
                }
            }

            if (payload.voltaje_amperaje !== undefined) {
                await guardarSeccionUnica(
                    connection,
                    'voltaje_amperaje',
                    idInforme,
                    payload.voltaje_amperaje
                );
            }

            if (payload.filtros_y_componentes !== undefined) {
                if (Array.isArray(payload.filtros_y_componentes)) {
                    await reemplazarColeccion(
                        connection,
                        'detalle_filtros_componentes',
                        idInforme,
                        payload.filtros_y_componentes
                    );
                } else {
                    await guardarSeccionUnica(
                        connection,
                        'detalle_filtros_componentes',
                        idInforme,
                        payload.filtros_y_componentes
                    );
                }
            }

            if (payload.detalle_informe !== undefined) {
                const detalleInforme = {
                    descripcionTrabajo:
                        payload.detalle_informe?.descripcionTrabajo ?? null,
                    recomendaciones:
                        payload.detalle_informe?.recomendaciones ?? null,
                    conclusiones:
                        payload.detalle_informe?.conclusiones ?? null
                };

                await guardarSeccionUnica(
                    connection,
                    'detalle_informe',
                    idInforme,
                    detalleInforme
                );
            }

            const datosResponsable =
                payload.servicio_responsable ??
                payload.cierre_responsable;

            if (datosResponsable !== undefined) {
                const responsableOriginal = obtenerPrimerRegistro(datosResponsable) ?? {};
                const encargado = String(responsableOriginal.encargado ?? '').trim().slice(0, 255) || null;
                const firma = typeof responsableOriginal.firma === 'string' && responsableOriginal.firma.trim()
                    ? responsableOriginal.firma.trim()
                    : null;
                if (firma && !/^data:image\/(?:png|jpeg|webp);base64,/i.test(firma) && !/^https:\/\//i.test(firma)) {
                    throw new Error('El formato de la firma del responsable no es válido');
                }

                if (!encargado && !firma) {
                    await connection.execute(
                        'DELETE FROM cierre_responsable WHERE id_informe = ?',
                        [idInforme]
                    );
                } else {
                    await guardarSeccionUnica(
                        connection,
                        'cierre_responsable',
                        idInforme,
                        { encargado, firma }
                    );
                }
            }

            if (Array.isArray(payload.imagenes_servicio)) {
                await reemplazarColeccion(
                    connection,
                    'imagenes_informe',
                    idInforme,
                    payload.imagenes_servicio
                );
            }

            await connection.execute(
                `
            UPDATE ot_detalles
            SET estado_equipo = CASE
                WHEN LOWER(TRIM(estado_equipo)) = 'pendiente'
                    THEN 'En proceso'
                ELSE estado_equipo
            END
            WHERE id_ot_detalle = ?
            `,
                [detalleId]
            );

            await connection.commit();

            return {
                id_informe: idInforme,
                id_ot_detalle: detalleId,
                guardado: true
            };
        } catch (error) {
            await connection.rollback();

            console.error('Error al guardar informe:', {
                message: error.message,
                code: error.code,
                sqlMessage: error.sqlMessage,
                sqlState: error.sqlState
            });

            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Finaliza el informe, el detalle OT y,
     * si corresponde, la Orden de Trabajo.
     */
    async finalizarInforme(idOtDetalle) {
        const connection =
            await db.getConnection();

        try {
            await connection.beginTransaction();

            const detalleId =
                Number(idOtDetalle);

            const [informes] =
                await connection.execute(
                    `
                    SELECT
                        inf.id_informe,
                        inf.id_ot_detalle,
                        od.id_ot
                    FROM informes_servicio inf

                    INNER JOIN ot_detalles od
                        ON od.id_ot_detalle =
                           inf.id_ot_detalle

                    WHERE inf.id_ot_detalle = ?

                    LIMIT 1
                    FOR UPDATE
                    `,
                    [detalleId]
                );

            if (informes.length === 0) {
                throw new Error(
                    'El informe todavía no existe'
                );
            }

            const idInforme =
                informes[0].id_informe;

            const idOt =
                informes[0].id_ot;

            await connection.execute(
                `
                UPDATE informes_servicio
                SET fecha_finalizacion = NOW(),
                    estado_revision = 'No revisado'
                WHERE id_informe = ?
                `,
                [idInforme]
            );

            await connection.execute(
                `
                UPDATE ot_detalles
                SET estado_equipo =
                    'Finalizado'
                WHERE id_ot_detalle = ?
                `,
                [detalleId]
            );

            const [pendientes] = await connection.execute(
                `
                SELECT COUNT(*) AS total
                FROM ot_detalles od
                LEFT JOIN informes_servicio inf
                    ON inf.id_ot_detalle = od.id_ot_detalle
                WHERE od.id_ot = ?
                  AND (
                      inf.id_informe IS NULL
                      OR inf.fecha_finalizacion IS NULL
                  )
                `,
                [idOt]
            );

            const informesCompletos =
                Number(pendientes[0]?.total ?? 0) === 0;

            await connection.commit();

            return {
                id_informe:
                    idInforme,

                id_ot_detalle:
                    detalleId,

                id_ot:
                    idOt,

                informes_completos:
                    informesCompletos,

                orden_finalizada:
                    false
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

export default informesRepository;
