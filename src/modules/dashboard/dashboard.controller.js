// dashboard.controller.js (BACKEND)
import { DashboardService } from './dashboard.service.js';

// 1. Controlador General
export const getDashboardStats = async (req, res) => {
    try {
        const datos = await DashboardService.obtenerDatosDashboard(req.query);
        return res.status(200).json(datos);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: "Error general", detalles: error.message });
    }
};

// 2. NUEVO: Controlador para un técnico específico
export const getTecnicoStats = async (req, res) => {
    try {
        const { id_usuario } = req.params; // Viene de la ruta /stats/tecnico/:id_usuario
        
        // Llamamos al servicio pasando el ID del técnico
        const datos = await DashboardService.obtenerDatosPorTecnico(id_usuario);
        
        return res.status(200).json(datos);
    } catch (error) {
        return res.status(500).json({ 
            error: "Error al cargar las métricas individuales del técnico", 
            detalles: error.message 
        });
    }
};
