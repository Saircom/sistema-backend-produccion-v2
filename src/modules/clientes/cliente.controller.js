// src/modules/clientes/clientes.controller.js
import { clientesService } from './cliente.service.js';

export const clientesController = {
    // GET /api/clientes o /api/clientes?search=texto
    async getAll(req, res) {
        try {
            const { search } = req.query; // Captura el parámetro de búsqueda desde la URL
            let data;

            if (search) {
                // Si viene el parámetro 'search', filtramos por RUC o Razón Social
                data = await clientesService.searchClientes(search);
            } else {
                // Si no viene nada, listamos todos los clientes por defecto
                data = await clientesService.getAllClients();
            }

            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // GET /api/clientes/:id
    async getById(req, res) {
        try {
            const { id } = req.params;
            const data = await clientesService.getClientById(id);

            if (!data) {
                return res.status(404).json({ success: false, error: 'Client not found.' });
            }

            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
    },

    // POST /api/clientes
    // ACTUALIZADO: Extrae el id_usuario de la sesión o token (req.user)
    async saveClient(req, res) {
        try {
            // Validamos que exista la sesión/token decodificado en la petición
            if (!req.user || !req.user.id_usuario) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized: Authentication required to create a client.'
                });
            }

            // Unimos el cuerpo del formulario con el id del usuario que inició sesión
            const clientPayload = {
                ...req.body,
                creado_por: req.user.id_usuario // Inyectamos el ID del usuario
            };

            const result = await clientesService.createClient(clientPayload);
            return res.status(201).json({ success: true, ...result });
        } catch (error) {
            const statusCode = error.status || 500;
            return res.status(statusCode).json({ success: false, error: error.message });
        }
    },

    // PUT /api/clientes/:id
    async updateClient(req, res) {
        try {
            const { id } = req.params;
            const result = await clientesService.updateClient(id, req.body);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            const statusCode = error.status || 500;
            return res.status(statusCode).json({ success: false, error: error.message });
        }
    },

    // DELETE /api/clientes/:id
    // src/modules/clientes/clientes.controller.js
    async removeClient(req, res) {
        try {
            const { id } = req.params;
            const result = await clientesService.deleteClient(id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error("ERROR REAL AL ELIMINAR:", error); // 👈 Añade esto temporalmente
            const statusCode = error.status || 500;
            return res.status(statusCode).json({ success: false, error: error.message });
        }
    }
};