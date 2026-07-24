import { DashboardModel } from './dashboard.model.js';

const isoDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
export const DashboardService = {
    async obtenerDatosDashboard(filtros = {}) {
        const hoy = new Date(); const inicio = new Date(hoy); inicio.setDate(inicio.getDate()-89);
        const desde = filtros.desde || inicio.toISOString().slice(0,10);
        const hasta = filtros.hasta || hoy.toISOString().slice(0,10);
        if (!isoDate(desde) || !isoDate(hasta) || desde>hasta) { const error=new Error('El rango de fechas no es válido'); error.statusCode=400; throw error; }
        const data = await DashboardModel.obtenerResumen(desde,hasta);
        const porcentaje=(parte,total)=>total?Number((Number(parte)*100/Number(total)).toFixed(1)):0;
        const decididas=Number(data.cotizaciones.aprobadas||0)+Number(data.cotizaciones.rechazadas||0);
        return { periodo:{desde,hasta},generado_en:new Date().toISOString(),...data,indicadores:{
            tasa_finalizacion_ot:porcentaje(data.ot.finalizadas,data.ot.total),
            tasa_aprobacion_cotizaciones:porcentaje(data.cotizaciones.aprobadas,decididas),
            tasa_revision_informes:porcentaje(data.informes.revisados,data.informes.total),
            disponibilidad_flota:porcentaje(data.movilidades.disponibles,data.movilidades.total),
            integridad_tiempos:porcentaje(data.tiempos.completos,data.tiempos.registros),
            costo_promedio_ot:Number(data.viaticos.ots_con_gasto)?Number((Number(data.viaticos.total)/Number(data.viaticos.ots_con_gasto)).toFixed(2)):0
        }};
    },
    async obtenerDatosPorTecnico(idUsuario) { const id=Number(idUsuario); if(!Number.isInteger(id)||id<=0) throw new Error('El ID del técnico es requerido'); return DashboardModel.obtenerServiciosPorTecnico(id); }
};
