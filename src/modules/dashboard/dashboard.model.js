import db from '../../config/db.js';

const rango = (columna, desde, hasta) => ({
    sql: `${columna} >= ? AND ${columna} < DATE_ADD(?, INTERVAL 1 DAY)`,
    params: [desde, hasta]
});
const first = rows => rows[0] || {};

export const DashboardModel = {
    async obtenerResumen(desde, hasta) {
        const otRange = rango('ot.fecha_programada', desde, hasta);
        const cotRange = rango('c.fecha_registro', desde, hasta);
        const viaRange = rango('v.fecha_gasto', desde, hasta);
        const [[otRows], [cotRows], [informeRows], [viaticoRows], [movilidadRows], [tiempoRows], [tendenciaRows], [clienteRows], [tecnicoRows], [alertaRows]] = await Promise.all([
            db.query(`SELECT COUNT(*) total,COALESCE(SUM(ot.estado='Programada'),0) programadas,COALESCE(SUM(ot.estado='En Proceso'),0) en_proceso,COALESCE(SUM(ot.estado='Finalizada'),0) finalizadas,COALESCE(SUM(ot.estado<>'Finalizada' AND ot.fecha_fin_programada IS NOT NULL AND ot.fecha_fin_programada<NOW()),0) vencidas FROM ordenes_trabajo ot WHERE ${otRange.sql}`, otRange.params),
            db.query(`SELECT COUNT(*) total,COALESCE(SUM(c.estado='borrador'),0) borrador,COALESCE(SUM(c.estado='enviada'),0) enviadas,COALESCE(SUM(c.estado='aprobada'),0) aprobadas,COALESCE(SUM(c.estado='rechazada'),0) rechazadas FROM cotizaciones c WHERE ${cotRange.sql}`, cotRange.params),
            db.query(`SELECT COUNT(*) total,COALESCE(SUM(i.estado_revision='No revisado'),0) no_revisados,COALESCE(SUM(i.estado_revision='Revisado'),0) revisados,COALESCE(SUM(i.estado_revision='Observado'),0) observados FROM informes_servicio i JOIN ot_detalles od ON od.id_ot_detalle=i.id_ot_detalle JOIN ordenes_trabajo ot ON ot.id_ot=od.id_ot WHERE ${otRange.sql}`, otRange.params),
            db.query(`SELECT COUNT(*) registros,COUNT(DISTINCT v.id_ot) ots_con_gasto,COALESCE(SUM(v.monto),0) total,COALESCE(SUM(CASE WHEN v.estado='pagado' THEN v.monto ELSE 0 END),0) pagado,COALESCE(SUM(CASE WHEN v.estado='validado' THEN v.monto ELSE 0 END),0) por_pagar,COALESCE(SUM(CASE WHEN v.estado='registrado' THEN v.monto ELSE 0 END),0) por_validar,COALESCE(SUM(CASE WHEN v.estado='rechazado' THEN v.monto ELSE 0 END),0) rechazado FROM ot_viaticos v WHERE ${viaRange.sql}`, viaRange.params),
            db.query(`SELECT COUNT(*) total,COALESCE(SUM(estado_disponibilidad='Disponible'),0) disponibles,COALESCE(SUM(estado_disponibilidad='En uso'),0) en_uso,COALESCE(SUM(estado_disponibilidad='En mantenimiento'),0) mantenimiento FROM movilidades`),
            db.query(`SELECT COUNT(*) registros,COALESCE(SUM(st.fecha_hora_llegada IS NOT NULL AND st.fecha_hora_inicio IS NOT NULL AND st.fecha_hora_fin IS NOT NULL AND st.fecha_hora_llegada<=st.fecha_hora_inicio AND st.fecha_hora_inicio<=st.fecha_hora_fin),0) completos,ROUND(AVG(CASE WHEN st.fecha_hora_inicio IS NOT NULL AND st.fecha_hora_fin>=st.fecha_hora_inicio THEN TIMESTAMPDIFF(MINUTE,st.fecha_hora_inicio,st.fecha_hora_fin) END),0) promedio_ejecucion_min,ROUND(AVG(CASE WHEN st.fecha_hora_llegada IS NOT NULL AND st.fecha_hora_inicio>=st.fecha_hora_llegada THEN TIMESTAMPDIFF(MINUTE,st.fecha_hora_llegada,st.fecha_hora_inicio) END),0) promedio_espera_min FROM servicio_tiempos st JOIN ot_detalles od ON od.id_ot_detalle=st.id_ot_detalle JOIN ordenes_trabajo ot ON ot.id_ot=od.id_ot WHERE ${otRange.sql}`, otRange.params),
            db.query(`SELECT DATE_FORMAT(ot.fecha_programada,'%Y-%m') periodo,COUNT(*) total,COALESCE(SUM(ot.estado='Finalizada'),0) finalizadas FROM ordenes_trabajo ot WHERE ${otRange.sql} GROUP BY periodo ORDER BY periodo`, otRange.params),
            db.query(`SELECT cl.id_cliente,cl.razon_social,COUNT(DISTINCT ot.id_ot) ordenes,COALESCE(SUM(vg.total),0) viaticos FROM ordenes_trabajo ot JOIN cotizaciones c ON c.id_cotizacion=ot.id_cotizacion JOIN clientes cl ON cl.id_cliente=c.id_cliente LEFT JOIN (SELECT id_ot,SUM(monto) total FROM ot_viaticos GROUP BY id_ot) vg ON vg.id_ot=ot.id_ot WHERE ${otRange.sql} GROUP BY cl.id_cliente,cl.razon_social ORDER BY ordenes DESC,viaticos DESC LIMIT 8`, otRange.params),
            db.query(`SELECT u.id_usuario,CONCAT_WS(' ',u.nombres,u.apellidos) tecnico,COUNT(DISTINCT ot.id_ot) ordenes,COUNT(DISTINCT CASE WHEN ot.estado<>'Finalizada' THEN ot.id_ot END) activas,COUNT(DISTINCT CASE WHEN ot.estado='Finalizada' THEN ot.id_ot END) finalizadas FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol LEFT JOIN (SELECT id_ot,id_tecnico_responsable id_usuario FROM ordenes_trabajo UNION SELECT id_ot,id_usuario FROM asignaciones_tecnicos) asignacion ON asignacion.id_usuario=u.id_usuario LEFT JOIN ordenes_trabajo ot ON ot.id_ot=asignacion.id_ot AND ${otRange.sql} WHERE UPPER(TRIM(r.nombre_rol))='TECNICO' AND u.estado=1 GROUP BY u.id_usuario,u.nombres,u.apellidos ORDER BY activas DESC,ordenes DESC LIMIT 10`, otRange.params),
            db.query(`SELECT ot.id_ot,ot.fecha_programada,ot.fecha_fin_programada,ot.estado,cl.razon_social cliente,CONCAT_WS(' ',u.nombres,u.apellidos) tecnico FROM ordenes_trabajo ot JOIN cotizaciones c ON c.id_cotizacion=ot.id_cotizacion JOIN clientes cl ON cl.id_cliente=c.id_cliente LEFT JOIN usuarios u ON u.id_usuario=ot.id_tecnico_responsable WHERE ot.estado<>'Finalizada' AND ot.fecha_fin_programada IS NOT NULL AND ot.fecha_fin_programada<NOW() ORDER BY ot.fecha_fin_programada ASC LIMIT 8`)
        ]);
        return { ot:first(otRows),cotizaciones:first(cotRows),informes:first(informeRows),viaticos:first(viaticoRows),movilidades:first(movilidadRows),tiempos:first(tiempoRows),tendencia:tendenciaRows,clientes:clienteRows,tecnicos:tecnicoRows,alertas:alertaRows };
    },
    async obtenerServiciosPorTecnico(idUsuario) {
        const [rows] = await db.query(`SELECT DISTINCT ot.* FROM ordenes_trabajo ot LEFT JOIN asignaciones_tecnicos a ON a.id_ot=ot.id_ot WHERE ot.id_tecnico_responsable=? OR a.id_usuario=? ORDER BY ot.fecha_programada DESC`, [idUsuario,idUsuario]);
        return rows;
    }
};
