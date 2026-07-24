import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import { configureRealtime } from './src/realtime/socket.js';

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const server = http.createServer(app);
const origins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:5173'];

const io = new Server(server, {
    cors: { origin: origins, methods: ['GET', 'POST'] }
});

app.set('io', io);
configureRealtime(io);

server.listen(PORT, HOST, () => {
    console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
});