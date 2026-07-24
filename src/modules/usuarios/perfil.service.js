import bcrypt from 'bcrypt';
import { UsuarioModels } from './usuario.model.js';

const validarNombre = (value, campo) => {
    const normalized = String(value || '').trim().replace(/\s+/g, ' ');
    if (normalized.length < 2 || normalized.length > 80 || !/^[\p{L}\p{M}' -]+$/u.test(normalized)) {
        const error = new Error(`${campo} no es válido`);
        error.status = 400;
        throw error;
    }
    return normalized.toUpperCase();
};

const validarPassword = value => {
    if (typeof value !== 'string' || value.length < 10 || value.length > 128 || !/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(value) || !/\d/.test(value)) {
        const error = new Error('La contraseña nueva debe tener entre 10 y 128 caracteres, incluyendo letras y números');
        error.status = 400;
        throw error;
    }
};

export const PerfilService = {
    async obtener(idUsuario) {
        const usuario = await UsuarioModels.findById(idUsuario);
        if (!usuario) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
        return usuario;
    },

    async actualizarDatos(idUsuario, data) {
        const nombres = validarNombre(data.nombres, 'Los nombres');
        const apellidos = validarNombre(data.apellidos, 'Los apellidos');
        await UsuarioModels.updateProfile(idUsuario, nombres, apellidos);
        return { success: true, message: 'Perfil actualizado correctamente', usuario: await this.obtener(idUsuario) };
    },

    async cambiarPassword(idUsuario, data) {
        const actual = data.password_actual;
        const nueva = data.password_nueva;
        if (typeof actual !== 'string' || !actual) {
            throw Object.assign(new Error('Debe ingresar su contraseña actual'), { status: 400 });
        }
        validarPassword(nueva);
        if (actual === nueva) {
            throw Object.assign(new Error('La contraseña nueva debe ser diferente de la actual'), { status: 400 });
        }
        const credentials = await UsuarioModels.findCredentialsById(idUsuario);
        if (!credentials || !(await bcrypt.compare(actual, credentials.password))) {
            throw Object.assign(new Error('La contraseña actual es incorrecta'), { status: 401 });
        }
        await UsuarioModels.updatePassword(idUsuario, await bcrypt.hash(nueva, 10));
        return { success: true, message: 'Contraseña actualizada correctamente' };
    }
};
