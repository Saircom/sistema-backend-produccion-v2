import multer from "multer";

// 📌 Configuración del almacenamiento EN MEMORIA
// Esto guarda el archivo temporalmente en req.file.buffer para Sharp y Cloudinary
const storage = multer.memoryStorage();

// 📌 Filtros para permitir solo imágenes
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        req.fileValidationError =
            "Formato no permitido. Solo se aceptan JPG, PNG, GIF, WEBP y PDF.";
        cb(null, false);
    }
};

// 📌 Configuración final de Multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
});

// Exportación por defecto para ES Modules
export default upload;