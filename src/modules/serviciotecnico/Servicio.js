const connection = require('../config/db');

const Servicio = {
    // Obtener lista
    findAllByRole: (rol, id_usuario, callback) => {
        let query = `
          SELECT s.id_servicio, c.razon_social, s.marca, s.modelo, s.serie, 
                 s.tipoServicio, s.tipo_equipo, s.estado, s.fechainicio,
                 u.nombres AS nombre_usuario, u.apellidos AS apellido_usuario
          FROM servicio s
          JOIN cliente c ON s.id_cliente = c.id_cliente
          JOIN usuario u ON s.id_usuario = u.id_usuario
        `;
        let params = [];
        if (rol === "tecnico") {
            query += ` WHERE s.fechainicio >= DATE_SUB(CURDATE(), INTERVAL 3 DAY) AND s.id_usuario = ?`;
            params.push(id_usuario);
        }
        connection.query(query, params, callback);
    },

    // models/Servicio.js
    getDetalleCompleto: (id_servicio, callback) => {
        const query = `
        SELECT 
            s.*, 
            u.nombres AS tecnico_nombres, u.apellidos AS tecnico_apellidos,
            c.razon_social, c.ruc, c.contacto,
            va.*, 
            fc.*
        FROM servicio s
        LEFT JOIN usuario u ON s.id_usuario = u.id_usuario
        LEFT JOIN cliente c ON s.id_cliente = c.id_cliente
        LEFT JOIN voltaje_amperaje va ON s.id_servicio = va.id_servicio
        LEFT JOIN filtros_y_componentes fc ON s.id_servicio = fc.id_servicio
        WHERE s.id_servicio = ?;
    `;

        connection.query(query, [id_servicio], (err, results) => {
            if (err) return callback(err);

            // 1. Verificamos si existe el servicio
            if (results.length === 0) return callback(null, null);

            // 2. Definimos servicioCompleto AQUÍ
            const servicioCompleto = results[0];

            // 3. Segunda consulta para imágenes (dentro del mismo bloque)
            const queryImgs = `SELECT id_imagen, titulo, url_imagen FROM imagenes_servicio WHERE id_servicio = ?`;

            connection.query(queryImgs, [id_servicio], (errImg, imgs) => {
                if (errImg) {
                    console.error("Error en queryImgs:", errImg);
                    servicioCompleto.imagenes = [];
                } else {
                    // Ahora servicioCompleto SÍ está definido en este alcance
                    servicioCompleto.imagenes = imgs.map(img => ({
                        id: img.id_imagen,
                        titulo: img.titulo,
                        url: img.url_imagen
                    }));
                }

                // 4. Devolvemos el objeto final
                callback(null, servicioCompleto);
            });
        });
    }

    ,
    // CREAR REPORTE
    create: (data, callback) => {
        // 1. Extraemos voltajes, filtros y dejamos el resto para la tabla 'servicio'
        const {
            // Voltajes
            amp1, amp2, amp3, amp_vacio_minimo_l1, amp_vacio_minimo_l2, amp_vacio_minimo_l3,
            volt1, volt2, volt3, vacio_minimo_l1, vacio_minimo_l2, vacio_minimo_l3,
            // Filtros
            filtroAirePrim, filtroAireSec, filtroAceite, filtroSepPrim, filtroSepSec,
            lubricante, orifRet, filtRet, enfrAceite, conexMotor, kitPresMin,
            kitParAceite, kitRegAdm, kitRegEsp, kitValvAdm, kitSullicon, kitSol2Vias,
            kitSol3Vias, preFiltCoal, ventMotorPrin, kitValvTerm, kitRepEsp,
            valvShut1, valvAlivio, valvChkDesc, valvChkCtrl, valvChk1, acopFlex,
            postFiltCoal, conexMotorSec, mangLub, drenAutoTanque, drenAutoPref,
            drenAutoSeca, anilloTanque, filtLineCtrl, trampAgua, carbonActAir,
            tableroEquip, ventMotorSec, Condensador, Elementoacople, Evaporador,
            // Datos base
            ...datosServicio
        } = data;

        const sqlServicio = "INSERT INTO servicio SET ?, fechainicio = NOW(), estado = 'No revisado'";

        connection.query(sqlServicio, datosServicio, (err, result) => {
            if (err) return callback(err);
            const nuevoIdServicio = result.insertId;

            // 2. Insertar Voltajes
            const queryVoltaje = `
            INSERT INTO voltaje_amperaje (
                id_servicio, amp1, amp2, amp3, amp_vacio_minimo_l1, amp_vacio_minimo_l2, amp_vacio_minimo_l3,
                volt1, volt2, volt3, vacio_minimo_l1, vacio_minimo_l2, vacio_minimo_l3
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const valoresVoltaje = [
                nuevoIdServicio, amp1 || "", amp2 || "", amp3 || "",
                amp_vacio_minimo_l1 || "", amp_vacio_minimo_l2 || "", amp_vacio_minimo_l3 || "",
                volt1 || "", volt2 || "", volt3 || "", vacio_minimo_l1 || "", vacio_minimo_l2 || "", vacio_minimo_l3 || ""
            ];

            connection.query(queryVoltaje, valoresVoltaje, (errVolt) => {
                if (errVolt) return callback(errVolt);

                // 3. Insertar Filtros
                const queryFiltros = `
                INSERT INTO filtros_y_componentes (
                    id_servicio, filtroAirePrim, filtroAireSec, filtroAceite, filtroSepPrim, 
                    filtroSepSec, lubricante, orifRet, filtRet, enfrAceite, conexMotor, 
                    kitPresMin, kitParAceite, kitRegAdm, kitRegEsp, kitValvAdm, 
                    kitSullicon, kitSol2Vias, kitSol3Vias, preFiltCoal, ventMotorPrin, 
                    kitValvTerm, kitRepEsp, valvShut1, valvAlivio, valvChkDesc, 
                    valvChkCtrl, valvChk1, acopFlex, postFiltCoal, conexMotorSec, 
                    mangLub, drenAutoTanque, drenAutoPref, drenAutoSeca, anilloTanque, 
                    filtLineCtrl, trampAgua, carbonActAir, tableroEquip, ventMotorSec, 
                    Condensador, Elementoacople, Evaporador
                ) VALUES (${new Array(44).fill('?').join(',')})`; // Genera 44 signos de interrogación

                const valoresFiltros = [
                    nuevoIdServicio, filtroAirePrim || "", filtroAireSec || "", filtroAceite || "", filtroSepPrim || "",
                    filtroSepSec || "", lubricante || "", orifRet || "", filtRet || "", enfrAceite || "",
                    conexMotor || "", kitPresMin || "", kitParAceite || "", kitRegAdm || "", kitRegEsp || "",
                    kitValvAdm || "", kitSullicon || "", kitSol2Vias || "", kitSol3Vias || "", preFiltCoal || "",
                    ventMotorPrin || "", kitValvTerm || "", kitRepEsp || "", valvShut1 || "", valvAlivio || "",
                    valvChkDesc || "", valvChkCtrl || "", valvChk1 || "", acopFlex || "", postFiltCoal || "",
                    conexMotorSec || "", mangLub || "", drenAutoTanque || "", drenAutoPref || "", drenAutoSeca || "",
                    anilloTanque || "", filtLineCtrl || "", trampAgua || "", carbonActAir || "", tableroEquip || "",
                    ventMotorSec || "", Condensador || "", Elementoacople || "", Evaporador || ""
                ];

                connection.query(queryFiltros, valoresFiltros, (errFilt) => {
                    if (errFilt) return callback(errFilt);
                    callback(null, nuevoIdServicio);
                });
            });
        });
    },

    update: (id_servicio, data, callback) => {
        // 1. Listas Blancas (Asegúrate de que coincidan con los nombres que vienen del Frontend)
        const camposVoltaje = [
            'amp1', 'amp2', 'amp3', 'amp_vacio_minimo_l1', 'amp_vacio_minimo_l2', 'amp_vacio_minimo_l3',
            'volt1', 'volt2', 'volt3', 'vacio_minimo_l1', 'vacio_minimo_l2', 'vacio_minimo_l3'
        ];

        const camposFiltros = [
            'filtroAirePrim', 'filtroAireSec', 'filtroAceite', 'filtroSepPrim', 'filtroSepSec',
            'lubricante', 'orifRet', 'filtRet', 'enfrAceite', 'conexMotor', 'kitPresMin',
            'kitParAceite', 'kitRegAdm', 'kitRegEsp', 'kitValvAdm', 'kitSullicon', 'kitSol2Vias',
            'kitSol3Vias', 'preFiltCoal', 'ventMotorPrin', 'kitValvTerm', 'kitRepEsp',
            'valvShut1', 'valvAlivio', 'valvChkDesc', 'valvChkCtrl', 'valvChk1', 'acopFlex',
            'postFiltCoal', 'conexMotorSec', 'mangLub', 'drenAutoTanque', 'drenAutoPref',
            'drenAutoSeca', 'anilloTanque', 'filtLineCtrl', 'trampAgua', 'carbonActAir',
            'tableroEquip', 'ventMotorSec', 'Condensador', 'Elementoacople', 'Evaporador'
        ];

        const datosServicio = {};
        const datosVoltaje = {};
        const datosFiltros = {};

        // 2. Clasificación de datos
        Object.keys(data).forEach(key => {
            if (camposVoltaje.includes(key)) {
                datosVoltaje[key] = data[key] === '' ? null : data[key];
            } else if (camposFiltros.includes(key)) {
                datosFiltros[key] = data[key] === '' ? null : data[key];
            } else {
                // Excluimos explícitamente basura antes de meter a 'servicio'
                const excluir = ['id_servicio', 'id_voltaje_amperaje', 'id_filtro_componente', 'tecnico_nombres', 'tecnico_apellidos', 'razon_social', 'ruc', 'contacto', 'imagenes', 'id_usuario'];
                if (!excluir.includes(key)) {
                    datosServicio[key] = data[key] === '' ? null : data[key];
                }
            }
        });

        // --- EJECUCIÓN CON VALIDACIÓN DE OBJETOS VACÍOS ---

        // A. Actualizar Servicio
        connection.query("UPDATE servicio SET ? WHERE id_servicio = ?", [datosServicio, id_servicio], (err) => {
            if (err) return callback(err);

            // B. Actualizar Voltajes (SOLO si el objeto tiene llaves)
            if (Object.keys(datosVoltaje).length > 0) {
                connection.query("UPDATE voltaje_amperaje SET ? WHERE id_servicio = ?", [datosVoltaje, id_servicio], (errV) => {
                    if (errV) console.error("❌ Error en Voltajes:", errV);
                    actualizarFiltros();
                });
            } else {
                actualizarFiltros();
            }

            function actualizarFiltros() {
                // C. Actualizar Filtros (SOLO si el objeto tiene llaves)
                if (Object.keys(datosFiltros).length > 0) {
                    connection.query("UPDATE filtros_y_componentes SET ? WHERE id_servicio = ?", [datosFiltros, id_servicio], (errF) => {
                        if (errF) return callback(errF);
                        callback(null, { message: "Actualizado" });
                    });
                } else {
                    callback(null, { message: "Actualizado (sin cambios en filtros)" });
                }
            }
        });
    },

    updateFirma: (id_servicio, firmaPath, encargado, callback) => {
        const sql = "UPDATE servicio SET firma = ?, encargado = ? WHERE id_servicio = ?";
        connection.query(sql, [firmaPath, encargado, id_servicio], callback);
    },

    // CAMBIAR SOLO ESTADO (Aquí estaba el error)
    updateEstado: (id, nuevoEstado, callback) => {
        const query = "UPDATE servicio SET estado = ? WHERE id_servicio = ?";
        // CAMBIO: Se cambió 'pool' por 'connection' para que coincida con la importación de arriba
        connection.query(query, [nuevoEstado, id], callback);
    },

    // Obtener un servicio por ID
    findById: (id_servicio, callback) => {
        const query = "SELECT * FROM servicio WHERE id_servicio = ?";
        connection.query(query, [id_servicio], (err, results) => {
            if (err) return callback(err);
            callback(null, results[0]);
        });
    }
};

module.exports = Servicio;