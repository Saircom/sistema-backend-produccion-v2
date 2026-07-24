import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    throw new Error("Falta definir JWT_SECRET en las variables de entorno");
}

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Cambiado a 401 porque el usuario aún no está autenticado
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Acceso denegado. Token ausente o mal formado." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
        if (!Number.isInteger(Number(decoded?.id_usuario)) || !decoded?.rol) {
            return res.status(401).json({ error: 'Token sin identidad o rol válido.' });
        }
        
        // Sincronizado con: id_usuario, nombres, apellidos, rol
        req.user = decoded; 

        next(); 
    } catch (err) {
        // Distinguimos si el token expiró o si es completamente inválido
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "El token ha expirado. Por favor, inicia sesión de nuevo." });
        }
        
        return res.status(401).json({ error: "Token inválido o alterado." });
    }
};

export default authMiddleware;
