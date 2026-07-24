import OpenAI from 'openai';
import multer from 'multer';

// Inicializar OpenAI usando la variable de entorno
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({ storage: multer.memoryStorage() });

export const procesarRecibo = async (req, res) => {
    try {
        const imageBuffer = req.file.buffer;
        
        // Convertir el buffer a base64 para enviarlo a la API
        const base64Image = imageBuffer.toString('base64');

        const response = await openai.chat.completions.create({
            model: "gpt-4o", // O gpt-4o-mini para menor costo
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Extrae de este recibo la fecha (YYYY-MM-DD), el monto total (número) y una descripción breve. Devuélvelo solo en formato JSON." },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                    ],
                },
            ],
            response_format: { type: "json_object" }
        });

        const resultado = JSON.parse(response.choices[0].message.content);
        res.json(resultado);
        
    } catch (error) {
        console.error("Error en procesamiento IA:", error);
        res.status(500).json({ error: "Error al procesar la imagen con IA" });
    }
};