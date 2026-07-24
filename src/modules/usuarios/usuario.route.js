// src/routes/usuario.routes.js
import express from 'express';
import { UsuarioController } from './usuario.controller.js';

const router = express.Router();

/* ===========================
   ROLES
=========================== */

router.get('/roles', UsuarioController.getRoles);

/* ===========================
   TÉCNICOS
=========================== */

// Debe ir antes de /:id
router.get('/tecnicos', UsuarioController.getTecnicos);

/* ===========================
   USUARIOS
=========================== */

// GET /api/usuarios
router.get('/', UsuarioController.getAll);

// GET /api/usuarios/:id
router.get('/:id', UsuarioController.getById);

// POST /api/usuarios
router.post('/', UsuarioController.create);

// PUT /api/usuarios/:id
router.put('/:id', UsuarioController.update);

// DELETE /api/usuarios/:id
router.delete('/:id', UsuarioController.delete);

export default router;