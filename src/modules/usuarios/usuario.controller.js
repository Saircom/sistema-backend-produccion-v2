// src/controllers/usuario.controller.js
import { UsuarioService } from './usuario.service.js';
import { isSuperAdmin } from '../../utils/roles.js';

export const UsuarioController = {
    // Obtener lista de roles para el formulario
    getRoles: async (req, res) => {
        try {
            const roles = await UsuarioService.getRoles();

            return res.status(200).json(roles);
        } catch (error) {
            return res.status(500).json({
                message: 'Error al obtener roles',
                error: error.message
            });
        }
    },

    // Obtener todos los usuarios
    getAll: async (req, res) => {
        try {
            const usuarios =
                await UsuarioService.getAllUsuarios();

            return res.status(200).json(usuarios);
        } catch (error) {
            return res.status(500).json({
                message: 'Error al obtener usuarios',
                error: error.message
            });
        }
    },

    // Obtener solamente técnicos activos
    getTecnicos: async (req, res) => {
        try {
            const tecnicos =
                await UsuarioService.getTecnicos();

            return res.status(200).json({
                success: true,
                data: tecnicos
            });
        } catch (error) {
            console.error(
                'Error al obtener técnicos:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Error al obtener técnicos',
                error: error.message
            });
        }
    },

    // Obtener usuario por ID
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            const usuario =
                await UsuarioService.getUsuarioById(id);

            return res.status(200).json(usuario);
        } catch (error) {
            return res.status(404).json({
                message: error.message
            });
        }
    },

    // Crear nuevo usuario
    create: async (req, res) => {
        try {
            const userData = req.body;

            const existe =
                await UsuarioService.checkIfExists(
                    userData.dni,
                    userData.correo
                );

            if (existe) {
                return res.status(400).json({
                    message:
                        'El DNI o correo ya están registrados'
                });
            }

            const nuevoUsuario =
                await UsuarioService.createUsuario(
                    userData,
                    req.user
                );

            return res.status(201).json({
                message: 'Usuario creado exitosamente',
                data: nuevoUsuario
            });
        } catch (error) {
            console.error(
                'Error al crear usuario:',
                error
            );

            return res.status(error.status || 500).json({
                message: error.status ? error.message : 'Error al crear usuario'
            });
        }
    },

    // Actualizar usuario
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const userData = req.body;

            if (userData.password && !isSuperAdmin(req.user)) {
                return res.status(403).json({ message: 'Solo el Superadministrador puede restablecer contraseñas de otros usuarios' });
            }

            const resultado =
                await UsuarioService.updateUsuario(
                    id,
                    userData,
                    req.user
                );

            return res.status(200).json(resultado);
        } catch (error) {
            return res.status(error.status || 400).json({
                message: error.message
            });
        }
    },

    // Cambiar estado del usuario
    updateEstado: async (req, res) => {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            const resultado =
                await UsuarioService.updateEstado(
                    id,
                    estado
                );

            return res.status(200).json(resultado);
        } catch (error) {
            return res.status(400).json({
                message: error.message
            });
        }
    },

    // Eliminar usuario
    delete: async (req, res) => {
        try {
            const { id } = req.params;

            const resultado =
                await UsuarioService.deleteUsuario(id, req.user);

            return res.status(200).json(resultado);
        } catch (error) {
            return res.status(error.status || 400).json({
                message: error.message
            });
        }
    }
};
