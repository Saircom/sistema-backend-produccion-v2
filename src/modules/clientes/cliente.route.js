// src/modules/clientes/clientes.routes.js
import { Router } from 'express';
import { clientesController } from './cliente.controller.js';
// ACTUALIZADO: Importamos tu middleware real
import authMiddleware from '../../middleware/authMiddleware.js';

const router = Router();

// 📌 Get all clients (Supports filtering via query: /?search=ruc_or_name)
router.get('/', clientesController.getAll);

// 📌 Get a client by ID
router.get('/:id', clientesController.getById);

// 📌 Add a new client
// ACTUALIZADO: Usamos authMiddleware aquí
router.post('/', authMiddleware, clientesController.saveClient);

// 📌 Update an existing client by ID
router.put('/:id', clientesController.updateClient);

// 📌 Remove a client by ID
router.delete('/:id', clientesController.removeClient);

export default router;