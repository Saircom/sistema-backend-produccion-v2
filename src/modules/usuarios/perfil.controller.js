import { PerfilService } from './perfil.service.js';

const responderError = (res, error) => res.status(error.status || 400).json({ message: error.message });

export const PerfilController = {
    obtener: async (req, res) => {
        try {
            res.json(await PerfilService.obtener(req.user.id_usuario));
        } catch (error) {
            responderError(res, error);
        }
    },

    actualizarDatos: async (req, res) => {
        try {
            res.json(await PerfilService.actualizarDatos(req.user.id_usuario, req.body));
        } catch (error) {
            responderError(res, error);
        }
    },

    cambiarPassword: async (req, res) => {
        try {
            res.json(await PerfilService.cambiarPassword(req.user.id_usuario, req.body));
        } catch (error) {
            responderError(res, error);
        }
    }
};
