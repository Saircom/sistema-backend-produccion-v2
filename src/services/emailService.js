import nodemailer from 'nodemailer';

// Configuración del transportador
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // O el host de tu proveedor
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Función exportable para enviar correos
export const enviarCorreo = async (destinatario, asunto, texto, html) => {
    try {
        await transporter.sendMail({
            from: `"Notificaciones Saircom" <${process.env.EMAIL_USER}>`,
            to: destinatario,
            subject: asunto,
            text: texto,
            html: html
        });
        console.log("Correo enviado exitosamente");
    } catch (error) {
        console.error("Error al enviar el correo:", error);
        throw error;
    }
};