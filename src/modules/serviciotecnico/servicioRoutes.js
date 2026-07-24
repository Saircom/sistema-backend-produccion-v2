const express = require('express');
const router = express.Router();
const servicioController = require('../controllers/servicioController');
const validateToken = require('../../middleware/authMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// --- CONFIGURACIÓN DE MULTER (Mismo código que ya tenías) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/firmas/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `firma-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// --- RUTAS GET ---
router.get('/',validateToken, servicioController.getServicios);

// Sincronizado con: exports.obtenerDetalleServicio
router.get('/:id_servicio', servicioController.obtenerDetalleServicio);

// --- RUTAS POST ---
router.post('/', validateToken, servicioController.insertarServicio);
router.post('/:id_servicio/firma', validateToken, upload.single('firma'), servicioController.subirFirma);

// --- RUTAS PUT (Aquí estaban los errores de Undefined) ---

// Sincronizado con: exports.updateEstado
// Nota: cambié :id por :id_servicio para consistencia
router.put('/:id_servicio/estado', validateToken, servicioController.updateEstado);

// Sincronizado con: exports.actualizarServicio
router.put('/:id_servicio', validateToken, servicioController.actualizarServicio);

module.exports = router;