// src/middlewares/upload.js

import multer from "multer";


// Guardar temporalmente el archivo en memoria
// para enviarlo después a Cloudinary
const storage = multer.memoryStorage();



// Validar tipos permitidos
const fileFilter = (req, file, cb) => {

    const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (allowedTypes.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Formato no permitido. Solo PDF, JPG, PNG o WEBP"
            ),
            false
        );

    }

};



// Configuración Multer
const upload = multer({

    storage,

    fileFilter,

    limits: {

        // Máximo 10 MB
        fileSize: 10 * 1024 * 1024

    }

});



export default upload;