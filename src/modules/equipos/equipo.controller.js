// src/modules/equipos/equipo.controller.js
import { equiposService } from './equipo.service.js';

export const equiposController = {
    // 1. Obtener listado de marcas disponibles
    async getMarcas(req, res) {
        try {
            const marcas = await equiposService.getListadoMarcas();
            res.json(marcas);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 2. Listado administrativo general
    async getAll(req, res) {
        try {
            const equipos = await equiposService.getAllEquipment();
            res.json(equipos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 3. Listado filtrado por ID de cliente (Post-Venta)
    async getByClient(req, res) {
        try {
            const { id_cliente } = req.params;
            const equipos = await equiposService.getEquipmentByClient(id_cliente);
            res.json(equipos);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // 4. Ver ficha técnica detallada
    async getDetails(req, res) {
        try {
            const { id } = req.params;
            const equipo = await equiposService.getEquipmentDetails(id);
            res.json(equipo);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    },

    // 5. Crear nuevo equipo
    async create(req, res) {
        try {
            const result = await equiposService.createNewEquipment(req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // 6. Actualizar equipo
    async update(req, res) {
        try {
            const { id } = req.params;
            const result = await equiposService.updateEquipment(id, req.body);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // 7. Eliminar equipo
    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await equiposService.deleteEquipment(id);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};