// src/services/lecturas.service.js
import pool from '../../../config/db.js';
import { CompresorModel } from './compresor.model.js';
import { SecadorModel } from './secador.model.js';
import { CombustionModel } from './combustion.model.js';
import { VoltajeAmperajeModel } from './voltaje_amperaje.model.js';
import { FiltrosModel } from './filtros_y_componentes.model.js';
import { InformeModel } from './informe.model.js'; // Integrado correctamente

export const lecturasService = {
    async createMany(idServicio, lecturas) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const item of lecturas) {
                if (!item.datos) continue; // Protección contra datos vacíos

                switch (item.tipo) {
                    case 'compresor': await CompresorModel.save(connection, idServicio, item.datos); break;
                    case 'secador': await SecadorModel.save(connection, idServicio, item.datos); break;
                    case 'combustion': await CombustionModel.save(connection, idServicio, item.datos); break;
                    case 'voltaje_amperaje': await VoltajeAmperajeModel.save(connection, idServicio, item.datos); break;
                    
                    case 'filtros_y_componentes':
                        // Aseguramos que pasamos un objeto válido y no nulo
                        if (!item.datos || typeof item.datos !== 'object') {
                            throw new Error("Datos de filtros_y_componentes mal formados");
                        }
                        await FiltrosModel.upsert(connection, idServicio, item.datos);
                        break;

                    // Integración de InformeModel en la creación
                    case 'informe': 
                        await InformeModel.save(connection, idServicio, item.datos); 
                        break;

                    default: throw new Error(`Tipo de lectura desconocido: ${item.tipo}`);
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async updateMany(idServicio, lecturas) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const item of lecturas) {
                if (!item.datos) continue;

                switch (item.tipo) {
                    case 'compresor': await CompresorModel.save(connection, idServicio, item.datos); break;
                    case 'secador': await SecadorModel.save(connection, idServicio, item.datos); break;
                    case 'combustion': await CombustionModel.save(connection, idServicio, item.datos); break;
                    case 'voltaje_amperaje': await VoltajeAmperajeModel.save(connection, idServicio, item.datos); break;
                    case 'filtros_y_componentes':
                        await FiltrosModel.upsert(connection, idServicio, item.datos);
                        break;

                    // Integración de InformeModel en la actualización
                    case 'informe': 
                        await InformeModel.save(connection, idServicio, item.datos); 
                        break;

                    default:
                        throw new Error(`Tipo de lectura desconocido: ${item.tipo}`);
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error("Error en Transacción de Actualización:", error);
            throw error;
        } finally {
            connection.release();
        }
    }
};