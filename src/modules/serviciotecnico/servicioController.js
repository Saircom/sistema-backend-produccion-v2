const Servicio = require('../../models/Servicio');
const { enviarNotificacionAdmin } = require('../../services/notificacionesService');

// controllers/servicioController.js
exports.getServicios = (req, res) => {
    const { id_usuario, rol } = req.user; // Datos del validateToken

    Servicio.findAllByRole(rol, id_usuario, (error, results) => {
        if (error) {
            return res.status(500).json({ error: "Error en la base de datos" });
        }

        // Enviamos siempre un array (si results es null, enviamos [])
        res.json({
            data: results || []
        });
    });
};

exports.obtenerDetalleServicio = (req, res) => {
    const { id_servicio } = req.params;

    Servicio.getDetalleCompleto(id_servicio, (error, servicio) => {
        if (error) {
            return res.status(500).json({ error: 'Error al obtener el servicio' });
        }

        if (!servicio) {
            return res.status(404).json({ message: 'No se encontró el servicio' });
        }

        // Formateo de campos especiales antes de enviar
        if (servicio.fechainicio) {
            servicio.fechainicio = new Date(servicio.fechainicio).toISOString().slice(0, 10);
        }
        
        // Si la firma viene como Buffer de la DB, convertir a string
        if (servicio.firma && Buffer.isBuffer(servicio.firma)) {
            servicio.firma = servicio.firma.toString();
        }

        // Enviamos el objeto 'servicio' que ya trae sus 'imagenes' desde el modelo
        res.json(servicio);
    });
};
// 3. INSERTAR O ACTUALIZAR REPORTE (Lógica unificada)
exports.insertarServicio = (req, res) => {
    // 1. Verificamos que el usuario esté autenticado (inyectado por validateToken)
    const id_usuario = req.user?.id_usuario;
    if (!id_usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado o sesión expirada' });
    }

    // 2. Unificamos el id_usuario con los datos que vienen del formulario (req.body)
    // req.body ahora contiene datos de: servicio, voltajes y filtros.
    const datosCompletos = { ...req.body, id_usuario };

    // 3. Llamamos al modelo (que ahora inserta en 3 tablas)
    Servicio.create(datosCompletos, (error, id_servicio) => {
        if (error) {
            console.error("❌ Error al crear el reporte completo:", error);
            return res.status(500).json({
                error: 'Error al crear reporte',
                detalle: error.sqlMessage || error.message
            });
        }

        // 4. Respondemos con el ID del nuevo servicio creado
        res.status(201).json({
            message: "Reporte creado con éxito en todas las tablas",
            id_servicio
        });
    });
};

exports.actualizarServicio = (req, res) => {
    const { id_servicio } = req.params;

    // Es buena práctica limpiar datos que el frontend envía pero que no van en el UPDATE
    // como nombres de técnicos o datos de clientes que son solo lectura
    const { tecnico_nombres, tecnico_apellidos, razon_social, ruc, contacto, imagenes, ...datosAActualizar } = req.body;

    Servicio.update(id_servicio, datosAActualizar, (error, result) => {
        if (error) {
            console.error("❌ Error en update controller:", error);
            return res.status(500).json({ error: 'Error al actualizar el reporte' });
        }

        res.json({
            message: 'Reporte y parámetros actualizados correctamente',
            id_servicio
        });
    });
};
// 4. GUARDAR FIRMA
exports.subirFirma = (req, res) => {
    const { id_servicio } = req.params;
    const { encargado } = req.body;
    const firmaPath = req.file ? `/uploads/firmas/${req.file.filename}` : null;

    if (!firmaPath) return res.status(400).json({ error: 'No se recibió el archivo de firma' });

    Servicio.updateFirma(id_servicio, firmaPath, encargado, (error) => {
        if (error) return res.status(500).json({ error: 'Error al actualizar firma' });

        // OPCIONAL: Notificar al admin que un reporte se ha firmado/finalizado
        // enviarNotificacionAdmin(id_servicio, "Firma registrada");

        res.json({ mensaje: 'Reporte finalizado con firma', url: firmaPath });
    });
};

// En tu controlador de servicios
exports.updateEstado = (req, res) => {
    const { id_servicio } = req.params; // Debe ser id_servicio coincidiendo con el router
    const { estado } = req.body;

    console.log(">>> Actualizando Estado:", { id_servicio, estado });

    if (!estado) {
        return res.status(400).json({ error: "El estado es requerido" });
    }

    Servicio.updateEstado(id_servicio, estado, (err, result) => {
        if (err) {
            console.error("❌ Error SQL en updateEstado:", err.sqlMessage || err);
            return res.status(500).json({ error: "Error de base de datos", details: err.sqlMessage });
        }
        res.json({ message: "Estado actualizado con éxito" });
    });
};

exports.getServicioById = (req, res) => {
    const { id_servicio } = req.params;
    ServicioModel.findById(id_servicio, (err, servicio) => {
        if (err || !servicio) return res.status(404).json({ error: "Servicio no encontrado" });
        res.json(servicio);
    });
};