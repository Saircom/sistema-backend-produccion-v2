// src/routes/usuario.routes.js
import express from 'express';
import { UsuarioController } from './usuario.controller.js';
import { requireRoles } from '../../middleware/security.middleware.js';

const router = express.Router();

/* ===========================
   ROLES
=========================== */

router.get('/roles', requireRoles('ADMINISTRADOR'), UsuarioController.getRoles);

/* ===========================
   TÉCNICOS
=========================== */

// Debe ir antes de /:id
// Permitido para PLANNER, ADMINISTRADOR, POSTVENTA y TECNICO
router.get('/tecnicos', requireRoles('ADMINISTRADOR', 'PLANNER', 'POSTVENTA', 'TECNICO'), UsuarioController.getTecnicos);

/* ===========================
   USUARIOS
=========================== */

// GET /api/usuarios (Gestión administrativa solo para Administrador)
router.get('/', requireRoles('ADMINISTRADOR'), UsuarioController.getAll);

// GET /api/usuarios/:id
router.get('/:id', requireRoles('ADMINISTRADOR'), UsuarioController.getById);

// POST /api/usuarios
router.post('/', requireRoles('ADMINISTRADOR'), UsuarioController.create);

// PUT /api/usuarios/:id
router.put('/:id', requireRoles('ADMINISTRADOR'), UsuarioController.update);

// DELETE /api/usuarios/:id
router.delete('/:id', requireRoles('ADMINISTRADOR'), UsuarioController.delete);

export default router;