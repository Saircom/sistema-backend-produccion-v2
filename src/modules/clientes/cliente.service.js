// src/modules/clientes/clientes.service.js
import Cliente from './cliente.model.js';

// 📌 Utility function to validate formats (Internal use only)
const validateClientFormat = (data) => {
    const ruc = String(data.ruc || '').trim();
    const correo = String(data.correo || '').trim();
    const rucRegex = /^[0-9]{11}$/; // Exactamente 11 dígitos
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Formato de email estándar

    if (!rucRegex.test(ruc)) return "El RUC debe contener exactamente 11 dígitos numéricos.";
    if (correo && !emailRegex.test(correo)) return "El formato del correo electrónico es inválido.";
    return null;
};

export const clientesService = {
    // 1. List absolutely all clients (Ahora incluirá 'creado_por_nombre')
    async getAllClients() {
        return await Cliente.getAll();
    },

    // 2. Find a specific client by ID (Ahora incluirá 'creado_por_nombre')
    async getClientById(id) {
        if (!id) throw new Error("ID de cliente no válido.");
        
        return await Cliente.getById(id);
    },

    // Buscar clientes por RUC o Razón Social
    async searchClientes(query) {
        if (!query) return [];
        return await Cliente.search(query);
    },

    // 3. Register a client with deep duplicate validation
    async createClient(clientData) {
        const ruc = String(clientData.ruc || '').trim();
        const correo = String(clientData.correo || '').trim();
        const clientPayload = {
            ...clientData,
            ruc,
            correo,
            razon_social: String(clientData.razon_social || '').trim(),
            direccion: String(clientData.direccion || '').trim(),
            celular: String(clientData.celular || '').trim(),
            contacto: String(clientData.contacto || '').trim(),
            distrito: String(clientData.distrito || '').trim() || null,
            provincia: String(clientData.provincia || '').trim() || null,
            departamento: String(clientData.departamento || '').trim() || null,
            zona: String(clientData.zona || '').trim() || null,
            creado_por: clientData.creado_por || null
        };

        // Format validation
        const formatError = validateClientFormat(clientPayload);
        if (formatError) {
            throw { status: 400, message: formatError };
        }

        // Database duplicate check (Solo por RUC, los correos pueden compartirse)
        const duplicates = await Cliente.checkDuplicate(ruc, '');

        if (duplicates.length > 0 && duplicates.some(c => c.ruc === ruc)) {
            throw { status: 409, message: `El RUC ${ruc} ya se encuentra registrado.` };
        }

        await Cliente.create(clientPayload);
        return { message: 'Cliente registrado exitosamente.' };
    },

    // 4. Update an existing client's data
    async updateClient(id, clientData) {
        if (!id) throw new Error("Se requiere el ID del cliente para actualizar.");

        const ruc = String(clientData.ruc || '').trim();
        const correo = String(clientData.correo || '').trim();
        const clientPayload = {
            ...clientData,
            ruc,
            correo,
            razon_social: String(clientData.razon_social || '').trim(),
            direccion: String(clientData.direccion || '').trim(),
            celular: String(clientData.celular || '').trim(),
            contacto: String(clientData.contacto || '').trim(),
            distrito: String(clientData.distrito || '').trim() || null,
            provincia: String(clientData.provincia || '').trim() || null,
            departamento: String(clientData.departamento || '').trim() || null,
            zona: String(clientData.zona || '').trim() || null
        };

        const formatError = validateClientFormat(clientPayload);
        if (formatError) {
            throw { status: 400, message: formatError };
        }

        try {
            const result = await Cliente.update(id, clientPayload);
            if (result.affectedRows === 0) {
                throw { status: 404, message: 'El cliente no existe o no se realizaron cambios.' };
            }
            return { message: 'Cliente actualizado exitosamente.' };
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw { status: 400, message: 'No se puede actualizar: El RUC ya pertenece a otro cliente.' };
            }
            throw err;
        }
    },

    // 5. Delete a client from the system
    async deleteClient(id) {
        if (!id) throw new Error("Se requiere el ID del cliente para eliminarlo.");

        try {
            const result = await Cliente.delete(id);
            if (result.affectedRows === 0) {
                throw { status: 404, message: 'Cliente no encontrado.' };
            }
            return { message: 'Cliente eliminado exitosamente.' };
        } catch (err) {
            // Foreign Key constraint handling
            throw { status: 500, message: 'No se puede eliminar: Este cliente tiene registros vinculados.' };
        }
    }
};