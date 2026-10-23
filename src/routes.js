import express from 'express';

// Importación moderna con ESM
import authRoutes from './modules/auth/authRoutes.js';
import equiposRouter from './modules/equipos/equipo.route.js';
import informeRouter from './modules/servicios/informe.route.js';
import clientesRouter from './modules/clientes/cliente.route.js';
import usuariosRouter from './modules/usuarios/usuario.route.js';
import perfilRouter from './modules/usuarios/perfil.route.js';

import lecturasRouter from './modules/servicios/lecturas/lectura.route.js';
import gastosRouter from './modules/gastos/gasto.route.js';
import viaticosRouter from './modules/viaticos/viatico.route.js';
import tiemposRouter from './modules/servicios/tiempos/tiempo.route.js';
import imageRouter from './modules/servicios/images/image.route.js';
import firmaRouter from './modules/servicios/firma/firma.route.js';
import cotizacionRouter2 from './modules/postventa/cotizacion.route.js';

import movilidadRouter from './modules/movilidad/movilidad.route.js';

//Cotizaciones 
import cotizacionRouter from './modules/cotizacion/cotizacion.routes.js';
import tiposervicioRouter from './modules/tiposervicio/tiposervicio.route.js';

//PLANNER
import ordentrabajoRouter from './modules/ordentrabajo/ot.route.js'

//TECNICO
import tecnicootRouter from './modules/tecnico/tecnicoOT.routes.js'

//INFORME TECNICO
import informetecnicoRouter from './modules/informestecnicos/informetecnico.route.js'

//DASHBOARD 
import DashboardRouter from './modules/dashboard/dashboard.route.js';

// 1. Importas tu middleware (ajusta la ruta según dónde guardaste el archivo)
import authMiddleware from './middleware/authMiddleware.js';
import { requireRoles, validateNumericParams } from './middleware/security.middleware.js';

const router = express.Router();

// 🛡️ ZONA 1: RUTAS PÚBLICAS
router.use('/auth', authRoutes);
router.use(authMiddleware);
router.use(validateNumericParams);

router.use('/dashboard', DashboardRouter);
router.use('/tecnico-ot', requireRoles('TECNICO', 'ADMINISTRADOR', 'PLANNER'), tecnicootRouter);
router.use('/cotizacion2', requireRoles('POSTVENTA', 'ADMINISTRADOR', 'PLANNER'), cotizacionRouter2);
router.use('/ordentrabajo', requireRoles('ADMINISTRADOR', 'PLANNER'), ordentrabajoRouter);
router.use('/tiposervicio', requireRoles('ADMINISTRADOR', 'POSTVENTA', 'PLANNER', 'TECNICO'), tiposervicioRouter);
// 🔐 ZONA 2: RUTAS PROTEGIDAS
// Para llegar aquí, el usuario SÍ O SÍ debió superar el 'authMiddleware'
router.use('/equipos', requireRoles('ADMINISTRADOR', 'POSTVENTA', 'PLANNER', 'TECNICO'), equiposRouter);
router.use('/informes', requireRoles('ADMINISTRADOR', 'POSTVENTA', 'PLANNER', 'TECNICO'), informeRouter);
router.use('/clientes', requireRoles('ADMINISTRADOR', 'POSTVENTA', 'PLANNER'), clientesRouter);
router.use('/perfil', perfilRouter);
router.use('/usuarios', requireRoles('ADMINISTRADOR'), usuariosRouter);
router.use('/lecturas', requireRoles('ADMINISTRADOR', 'PLANNER', 'TECNICO'), lecturasRouter);
router.use('/imagenes', requireRoles('ADMINISTRADOR', 'PLANNER', 'TECNICO'), imageRouter);
router.use('/firma', requireRoles('ADMINISTRADOR', 'PLANNER', 'TECNICO'), firmaRouter);
router.use('/gastos', requireRoles('ADMINISTRADOR', 'POSTVENTA', 'PLANNER', 'TECNICO'), gastosRouter);
router.use('/viaticos-ot', requireRoles('ADMINISTRADOR', 'PLANNER', 'TECNICO'), viaticosRouter);
router.use('/tiempos', requireRoles('ADMINISTRADOR', 'PLANNER', 'TECNICO'), tiemposRouter);
router.use('/movilidades', requireRoles('ADMINISTRADOR', 'PLANNER'), movilidadRouter);

router.use('/cotizacion', requireRoles('ADMINISTRADOR', 'POSTVENTA', 'PLANNER'), cotizacionRouter);
router.use('/informe-tecnico', requireRoles('ADMINISTRADOR', 'POSTVENTA', 'PLANNER'), informetecnicoRouter);



export default router;
