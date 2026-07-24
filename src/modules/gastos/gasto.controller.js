import { gastoService } from './gasto.service.js';
import { hasAnyRole } from '../../utils/roles.js';

export const gastoController = {

    async listar(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    mensaje: "Usuario no autenticado"
                });
            }

            const { id_usuario: idUsuario, rol } = req.user;

            let gastos;

            if (hasAnyRole(rol, 'ADMINISTRADOR')) {
                gastos = await gastoService.listarTodos();
            } else {
                gastos = await gastoService.obtenerPorUsuario(idUsuario);
            }

            res.json(gastos);

        } catch (error) {
            res.status(500).json({
                mensaje: error.message
            });
        }
    },

    async obtenerPorServicio(req, res) {
        try {
            const { idServicio } = req.params;
            const gastos = await gastoService.obtenerPorServicio(idServicio);
            res.json(gastos);
        } catch (error) {
            res.status(500).json({ mensaje: error.message });
        }
    },

    async obtenerOperativos(req, res) {
        try {
            const gastos = await gastoService.obtenerOperativos();
            res.json(gastos);
        } catch (error) {
            res.status(500).json({ mensaje: error.message });
        }
    },

    async crear(req, res) {
        try {
            const resultado = await gastoService.crearGasto(req.body);
            res.status(201).json(resultado);
        } catch (error) {
            res.status(500).json({ mensaje: error.message });
        }
    },

    async actualizarCabecera(req, res) {
        try {
            const { idGasto } = req.params;
            // Pasamos id y el body (que contiene los datos nuevos)
            const resultado = await gastoService.actualizarGasto(idGasto, req.body);
            res.json(resultado);
        } catch (error) {
            res.status(500).json({ mensaje: error.message });
        }
    },

    async actualizarDetalle(req, res) {
        try {
            const { idDetalle } = req.params;
            const resultado = await gastoService.actualizarDetalle(idDetalle, req.body);
            res.json(resultado);
        } catch (error) {
            res.status(500).json({ mensaje: error.message });
        }
    },

    async eliminarDetalle(req, res) {
        try {
            const { idDetalle } = req.params;
            const resultado = await gastoService.eliminarDetalle(idDetalle);
            res.json(resultado);
        } catch (error) {
            res.status(500).json({ mensaje: error.message });
        }
    },

    async eliminar(req, res) {
        try {
            const { idGasto } = req.params;
            const resultado = await gastoService.eliminarGasto(idGasto);
            res.json(resultado);
        } catch (error) {
            res.status(500).json({ mensaje: error.message });
        }
    }
};
