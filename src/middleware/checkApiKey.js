require('dotenv').config();

const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(403).json({ message: 'Acceso denegado: API Key inválida' });
    }

    next();
};

module.exports = validateApiKey;
