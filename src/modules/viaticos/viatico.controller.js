import { viaticoService } from './viatico.service.js';

const ejecutar = handler => async (req, res) => {
    try {
        const data = await handler(req);
        return res.status(req.method === 'POST' ? 201 : 200).json({ success: true, data });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'No se pudo procesar el gasto'
        });
    }
};

export const viaticoController = {
    listarAdmin: ejecutar(req => viaticoService.listarAdmin(req.user)),
    misPendientes: ejecutar(req => viaticoService.misPendientes(req.user)),
    catalogos: ejecutar(() => viaticoService.catalogos()),
    listar: ejecutar(req => viaticoService.listar(req.params.idOt, req.user)),
    subirComprobante: ejecutar(req => viaticoService.subirComprobante(
        req.params.idOt,
        req.user,
        req.file?.buffer
    )),
    crear: ejecutar(req => viaticoService.crear(req.params.idOt, req.body, req.user)),
    actualizar: ejecutar(req => viaticoService.actualizar(req.params.idViatico, req.body, req.user)),
    cambiarEstado: ejecutar(req => viaticoService.cambiarEstado(
        req.params.idViatico,
        req.body?.estado,
        req.user
    )),
    eliminar: ejecutar(req => viaticoService.eliminar(req.params.idViatico, req.user))
};
