import { UsuarioModels } from './usuario.model.js';
import bcrypt from 'bcrypt';
import { isSuperAdmin } from '../../utils/roles.js';

const saltRounds = 10;

export const UsuarioService = {
    async validarGestionSuperadmin(actor, { targetId = null, requestedRoleId = null } = {}) {
        if (isSuperAdmin(actor)) return;

        if (targetId) {
            const target = await UsuarioModels.findById(Number(targetId));
            if (target && isSuperAdmin(target.nombre_rol)) {
                const error = new Error('El Administrador no puede modificar ni eliminar a un Superadministrador');
                error.status = 403;
                throw error;
            }
        }

        if (requestedRoleId) {
            const role = await UsuarioModels.findRoleById(Number(requestedRoleId));
            if (!role) throw new Error('El rol seleccionado no existe');
            if (isSuperAdmin(role.nombre_rol)) {
                const error = new Error('Solo un Superadministrador puede asignar el rol Superadministrador');
                error.status = 403;
                throw error;
            }
        }
    },

    /**
     * Obtener roles para el formulario.
     */
    async getRoles() {
        return await UsuarioModels.findAllRoles();
    },

    /**
     * Obtener todos los usuarios.
     */
    async getAllUsuarios() {
        return await UsuarioModels.findAll();
    },

    /**
     * Obtener únicamente técnicos activos.
     * Este método se utilizará en el módulo Planner.
     */
    async getTecnicos() {
        const tecnicos = await UsuarioModels.findTecnicos();

        return Array.isArray(tecnicos)
            ? tecnicos
            : [];
    },

    /**
     * Obtener usuario por ID.
     */
    async getUsuarioById(id) {
        const idUsuario = Number(id);

        if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
            throw new Error('El ID del usuario no es válido');
        }

        const user = await UsuarioModels.findById(idUsuario);

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const { password, ...userWithoutPassword } = user;

        return userWithoutPassword;
    },

    /**
     * Validar si ya existe un usuario con el DNI o correo.
     */
    async checkIfExists(dni, correo) {
        const results =
            await UsuarioModels.findByDniOrEmail(
                dni,
                correo
            );

        return Array.isArray(results) &&
            results.length > 0;
    },

    /**
     * Crear usuario.
     */
    async createUsuario(userData, actor) {
        await this.validarGestionSuperadmin(actor, { requestedRoleId: userData.id_rol });
        if (!userData.password) {
            throw new Error(
                'La contraseña es obligatoria'
            );
        }

        const existe = await this.checkIfExists(
            userData.dni,
            userData.correo
        );

        if (existe) {
            throw new Error(
                'Ya existe un usuario con el DNI o correo ingresado'
            );
        }

        const hashedPassword = await bcrypt.hash(
            userData.password,
            saltRounds
        );

        const dataToSave = {
            ...userData,
            hashedPassword
        };

        delete dataToSave.password;

        const insertId =
            await UsuarioModels.create(dataToSave);

        const {
            password,
            hashedPassword: hash,
            ...userResponse
        } = dataToSave;

        return {
            id_usuario: insertId,
            ...userResponse
        };
    },

    /**
     * Actualizar usuario.
     */
    async updateUsuario(id, userData, actor) {
        const idUsuario = Number(id);

        if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
            throw new Error('El ID del usuario no es válido');
        }

        await this.validarGestionSuperadmin(actor, {
            targetId: idUsuario,
            requestedRoleId: userData.id_rol
        });

        const usuarioExistente =
            await UsuarioModels.findById(idUsuario);

        if (!usuarioExistente) {
            throw new Error('Usuario no encontrado');
        }

        const dataToUpdate = {
            ...userData
        };

        if (
            dataToUpdate.password &&
            dataToUpdate.password.trim() !== ''
        ) {
            if (dataToUpdate.password.length < 10 || dataToUpdate.password.length > 128 || !/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(dataToUpdate.password) || !/\d/.test(dataToUpdate.password)) {
                throw new Error('La contraseña debe tener entre 10 y 128 caracteres, incluyendo letras y números');
            }
            dataToUpdate.hashedPassword =
                await bcrypt.hash(
                    dataToUpdate.password,
                    saltRounds
                );

            delete dataToUpdate.password;
        } else {
            delete dataToUpdate.password;
            delete dataToUpdate.hashedPassword;
        }

        const affectedRows =
            await UsuarioModels.update(
                idUsuario,
                dataToUpdate
            );

        if (affectedRows === 0) {
            throw new Error(
                'No se pudo actualizar el usuario'
            );
        }

        return {
            success: true,
            message: 'Usuario actualizado con éxito'
        };
    },

    /**
     * Cambiar estado del usuario.
     */
    async updateEstado(id, estado) {
        const idUsuario = Number(id);
        const nuevoEstado = Number(estado);

        if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
            throw new Error('El ID del usuario no es válido');
        }

        if (![0, 1].includes(nuevoEstado)) {
            throw new Error(
                'El estado debe ser 0 o 1'
            );
        }

        const affectedRows =
            await UsuarioModels.updateEstado(
                idUsuario,
                nuevoEstado
            );

        if (affectedRows === 0) {
            throw new Error(
                'No se pudo actualizar el estado del usuario'
            );
        }

        return {
            success: true,
            message:
                'Estado del usuario actualizado correctamente'
        };
    },

    /**
     * Eliminar usuario.
     */
    async deleteUsuario(id, actor) {
        const idUsuario = Number(id);

        if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
            throw new Error('El ID del usuario no es válido');
        }


        await this.validarGestionSuperadmin(actor, { targetId: idUsuario });

        const affectedRows =
            await UsuarioModels.delete(idUsuario);

        if (affectedRows === 0) {
            throw new Error(
                'No se pudo eliminar, el usuario no existe'
            );
        }

        return {
            success: true,
            message: 'Usuario eliminado con éxito'
        };
    }
};
