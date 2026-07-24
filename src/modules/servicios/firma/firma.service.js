import pool from "../../../config/db.js";
import { FirmaModel } from "./firma.model.js";

export const FirmaService = {

    async save(data) {
        const connection = await pool.getConnection();
        try {
            return await FirmaModel.save(
                connection,
                data
            );
        } finally {
            connection.release();
        }
    },

    async update(id_servicio, data) {
        const connection = await pool.getConnection();
        try {
            return await FirmaModel.update(
                connection,
                id_servicio,
                data
            );
        } finally {
            connection.release();
        }
    },

    async findByServicio(id_servicio) {
        const connection = await pool.getConnection();
        try {
            return await FirmaModel.findByServicio(
                connection,
                id_servicio
            );
        } finally {
            connection.release();
        }
    }

};