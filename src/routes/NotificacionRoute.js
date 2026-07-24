const express = require('express');
const notificacionesController = require('../controllers/Notificacion');
const router = express.Router();
const validateToken = require('../middleware/authMiddleware');

router.get('/', validateToken, notificacionesController.obtenerNotificaciones);
router.put('/:id_notificacion', validateToken, notificacionesController.marcarComoLeida)
module.exports = router;
