import { v2 as cloudinary } from "cloudinary";
import "dotenv/config"; // Esto carga automáticamente el archivo .env al importar

// Cargar configuración desde la URL de Cloudinary
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL,
});

// Exportación por defecto para mantener la consistencia en tus servicios
export default cloudinary;