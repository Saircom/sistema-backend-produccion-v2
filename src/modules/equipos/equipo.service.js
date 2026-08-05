// src/modules/equipos/equipos.service.js
import { equiposRepository } from './equipo.repository.js';
import { marcasRepository } from './marcas.repository.js';

export const equiposService = {
    normalizarDatos(datos = {}) {
        const texto = (valor, maximo) => {
            const limpio = String(valor ?? '').trim().replace(/\s+/g, ' ');
            return limpio ? limpio.slice(0, maximo).toUpperCase() : null;
        };

        const normalizado = {
            id_cliente: Number(datos.id_cliente),
            id_marca: Number(datos.id_marca),
            tipo_equipo: texto(datos.tipo_equipo, 100),
            modelo: texto(datos.modelo, 255),
            unidadpn: texto(datos.unidadpn, 100),
            serie: texto(datos.serie, 255),
            unidadsn: texto(datos.unidadsn, 100),
            encargado_equipo: texto(datos.encargado_equipo, 255),
            sede: texto(datos.sede, 255),
            direccion: texto(datos.direccion, 255),
            codigo_interno: texto(datos.codigo_interno, 100) || 'NO APLICA'
        };

        if (!Number.isInteger(normalizado.id_cliente) || normalizado.id_cliente <= 0) throw new Error("El equipo debe estar vinculado a un cliente.");
        if (!Number.isInteger(normalizado.id_marca) || normalizado.id_marca <= 0) throw new Error("La marca del equipo es obligatoria.");
        if (!normalizado.tipo_equipo) throw new Error("El tipo de equipo es obligatorio.");
        if (!normalizado.modelo) throw new Error("El modelo del equipo es obligatorio.");
        if (!normalizado.serie) throw new Error("El número de serie es obligatorio.");
        if (!normalizado.encargado_equipo) throw new Error("El encargado del equipo es obligatorio.");

        return normalizado;
    },
    
    // Obtiene las marcas para poblar los selectores
    async getListadoMarcas() {
        return await marcasRepository.getAllActive();
    },

    // Crea un equipo asegurando vinculación obligatoria con cliente y marca
    async createNewEquipment(datos) {
        const equipo = this.normalizarDatos(datos);

        const idEquipoGenerado = await equiposRepository.create(equipo);

        if (datos.componentes) {
            await equiposRepository.createComponentes(idEquipoGenerado, datos.componentes);
        }
        
        return { 
            id_equipo: idEquipoGenerado, 
            message: "Equipo registrado exitosamente para el cliente." 
        };
    },

    // Actualiza datos asegurando que no se pierda la relación con el cliente
    async updateEquipment(id, datos) {
        if (!id) throw new Error("ID de equipo requerido.");
        const equipo = this.normalizarDatos(datos);
        
        const actualizado = await equiposRepository.update(id, equipo);
        if (!actualizado) throw new Error("No se pudo actualizar el equipo.");
        
        return { message: "Ficha técnica actualizada correctamente." };
    },

    // Obtiene detalles técnicos completos
    async getEquipmentDetails(idEquipo) {
        if (!idEquipo) throw new Error("ID de equipo no válido.");
        
        const data = await equiposRepository.getById(idEquipo);
        if (!data) throw new Error("El equipo solicitado no existe en la base de datos.");
        
        return data;
    },

    // Listado filtrado por cliente (Crucial para Post-Venta)
    async getEquipmentByClient(idCliente) {
        if (!idCliente) throw new Error("ID de cliente requerido para la consulta.");
        
        const equipos = await equiposRepository.getByCliente(idCliente);
        return equipos;
    },

    // Listado general (Administrativo)
    async getAllEquipment() {
        return await equiposRepository.getAll();
    },

    // Eliminar equipo
    async deleteEquipment(id) {
        if (!id) throw new Error("ID de equipo requerido.");
        
        const eliminado = await equiposRepository.remove(id);
        if (!eliminado) throw new Error("No se pudo eliminar el equipo.");
        
        return { message: "Equipo e infraestructura eliminados." };
    }
};
