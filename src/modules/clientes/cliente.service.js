// src/modules/clientes/clientes.service.js
import Cliente from './cliente.model.js';

// 📌 Utility function to validate formats (Internal use only)
const validateClientFormat = (data) => {
    const { ruc, correo } = data;
    const rucRegex = /^[0-9]{11}$/; // Exactly 11 digits
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Standard email regex

    if (!rucRegex.test(ruc)) return "The RUC must contain exactly 11 numeric digits.";
    if (!emailRegex.test(correo)) return "The email address format is invalid.";
    return null;
};

export const clientesService = {
    // 1. List absolutely all clients (Ahora incluirá 'creado_por_nombre')
    async getAllClients() {
        return await Cliente.getAll();
    },

    // 2. Find a specific client by ID (Ahora incluirá 'creado_por_nombre')
    async getClientById(id) {
        if (!id) throw new Error("Invalid client ID.");
        
        return await Cliente.getById(id);
    },

    // Buscar clientes por RUC o Razón Social
    async searchClientes(query) {
        if (!query) return [];
        return await Cliente.search(query);
    },

    // 3. Register a client with deep duplicate validation
    // ACTUALIZADO: Añadida validación para asegurar que 'creado_por' esté presente
    async createClient(clientData) {
        const { ruc, correo, creado_por } = clientData;

        // Validación: Asegurar que sabemos qué usuario está haciendo la acción
        if (!creado_por) {
            throw { status: 400, message: 'The user ID (creado_por) is required to register a client.' };
        }

        // Initial format validation
        const formatError = validateClientFormat(clientData);
        if (formatError) {
            throw { status: 400, message: formatError };
        }

        // Database duplicate check
        const duplicates = await Cliente.checkDuplicate(ruc, correo);

        if (duplicates.length > 0) {
            const rucExists = duplicates.some(c => c.ruc === ruc);
            const emailExists = duplicates.some(c => c.correo === correo);

            if (rucExists && emailExists) {
                throw { status: 409, message: 'Both the RUC and Email are already registered.' };
            } else if (rucExists) {
                throw { status: 409, message: `The RUC ${ruc} already exists.` };
            } else {
                throw { status: 409, message: `The email ${correo} is already in use.` };
            }
        }

        // 'clientData' ya contiene 'creado_por', por lo que el modelo lo recibirá correctamente
        await Cliente.create(clientData);
        return { message: 'Client registered successfully.' };
    },

    // 4. Update an existing client's data
    async updateClient(id, clientData) {
        if (!id) throw new Error("Client ID is required for updates.");

        const formatError = validateClientFormat(clientData);
        if (formatError) {
            throw { status: 400, message: formatError };
        }

        try {
            const result = await Cliente.update(id, clientData);
            if (result.affectedRows === 0) {
                throw { status: 404, message: 'Client does not exist or no changes were made.' };
            }
            return { message: 'Client updated successfully.' };
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw { status: 400, message: 'Cannot update: The RUC or email already belongs to another client.' };
            }
            throw err;
        }
    },

    // 5. Delete a client from the system
    async deleteClient(id) {
        if (!id) throw new Error("Client ID is required for deletion.");

        try {
            const result = await Cliente.delete(id);
            if (result.affectedRows === 0) {
                throw { status: 404, message: 'Client not found.' };
            }
            return { message: 'Client deleted successfully.' };
        } catch (err) {
            // Foreign Key constraint handling
            throw { status: 500, message: 'Cannot delete: This client has linked data in other tables.' };
        }
    }
};