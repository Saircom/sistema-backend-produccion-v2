import pool from '../../../config/db.js';

const ImagenInformeModel = {
    create: async (idInforme, titulo, url, publicId) => {
        const [result] = await pool.query(
            `INSERT INTO imagenes_informe (id_informe,titulo,url_imagen,public_id)
             VALUES (?,?,?,?)`,
            [idInforme, titulo, url, publicId]
        );
        return { id_imagen: result.insertId, id_informe: idInforme, titulo, url_imagen: url, public_id: publicId };
    },

    createMany: async imagenes => {
        if (!Array.isArray(imagenes) || imagenes.length === 0) return [];

        const values = imagenes.map(img => [
            img.id_informe,
            img.titulo,
            img.url_imagen,
            img.public_id
        ]);

        const [result] = await pool.query(
            `INSERT INTO imagenes_informe (id_informe,titulo,url_imagen,public_id)
             VALUES ?`,
            [values]
        );

        return {
            insertId: result.insertId,
            affectedRows: result.affectedRows
        };
    },

    findByInforme: async idInforme => {
        const [rows] = await pool.query(
            `SELECT id_imagen,id_informe,titulo,url_imagen,public_id
             FROM imagenes_informe
             WHERE id_informe=?
             ORDER BY id_imagen ASC`,
            [idInforme]
        );
        return rows;
    },

    findById: async idImagen => {
        const [rows] = await pool.query(
            `SELECT *
             FROM imagenes_informe
             WHERE id_imagen=?
             LIMIT 1`,
            [idImagen]
        );
        return rows[0] ?? null;
    },

    updateImage: async (idImagen, url, publicId) => {
        const [result] = await pool.query(
            `UPDATE imagenes_informe
             SET url_imagen=?,public_id=?
             WHERE id_imagen=?`,
            [url, publicId, idImagen]
        );
        return result.affectedRows > 0;
    },

    updateTitulo: async (idImagen, titulo) => {
        const [result] = await pool.query(
            `UPDATE imagenes_informe
             SET titulo=?
             WHERE id_imagen=?`,
            [titulo, idImagen]
        );
        return result.affectedRows > 0;
    },

    delete: async idImagen => {
        const [result] = await pool.query(
            `DELETE FROM imagenes_informe WHERE id_imagen=?`,
            [idImagen]
        );
        return result.affectedRows > 0;
    }
};

export default ImagenInformeModel;