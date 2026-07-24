const ALLOWED_FIELDS = [
    'filtroAirePrim', 'filtroAireSec', 'filtroAceite', 'filtroSepPrim', 'filtroSepSec', 'lubricante',
    'orifRet', 'filtRet', 'enfrAceite', 'conexMotor', 'kitPresMin', 'kitParAceite', 'kitRegAdm',
    'kitRegEsp', 'kitValvAdm', 'kitSullicon', 'kitSol2Vias', 'kitSol3Vias', 'preFiltCoal',
    'ventMotorPrin', 'kitValvTerm', 'kitRepEsp', 'valvShut1', 'valvAlivio', 'valvChkDesc',
    'valvChkCtrl', 'valvChk1', 'acopFlex', 'postFiltCoal', 'conexMotorSec', 'mangLub',
    'drenAutoTanque', 'drenAutoPref', 'drenAutoSeca', 'anilloTanque', 'filtLineCtrl',
    'trampAgua', 'carbonActAir', 'tableroEquip', 'ventMotorSec', 'Condensador',
    'Elementoacople', 'Evaporador', 'fajaAccionamiento', 'sistemaLubricacion'
];

const getSanitizedData = (data) => {
    const sanitized = {};
    ALLOWED_FIELDS.forEach(field => {
        // Solo incluimos si el valor existe (diferente de undefined o null)
        if (data[field] !== undefined && data[field] !== null) {
            sanitized[field] = String(data[field]);
        }
    });
    return sanitized;
};

export const FiltrosModel = {
    async upsert(connection, idServicio, data) {
        const sanitizedData = getSanitizedData(data);

        const id = parseInt(idServicio);
        if (Object.keys(sanitizedData).length === 0 || isNaN(id)) {
            console.warn(`Upsert omitido: Datos inválidos para id_servicio ${id}`);
            return false;
        }

        // Construimos las listas para la consulta
        const fields = Object.keys(sanitizedData);
        const placeholders = fields.map(() => '?').join(', ');
        const values = fields.map(field => sanitizedData[field]);

        // El id_servicio se añade al final para el INSERT y para el UPDATE
        fields.push('id_servicio');
        values.push(id);

        const updateClause = sanitizedData.id_servicio
            ? "" // Si no se actualiza id_servicio, no lo incluimos aquí
            : fields.filter(f => f !== 'id_servicio')
                .map(field => `${field} = VALUES(${field})`)
                .join(', ');

        const query = `
            INSERT INTO filtros_y_componentes (${fields.join(', ')})
            VALUES (${fields.map(() => '?').join(', ')})
            ON DUPLICATE KEY UPDATE ${updateClause}
        `;

        try {
            // Pasamos el array de valores directamente
            const [result] = await connection.execute(query, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error crítico en FiltrosModel.upsert:", error);
            throw error;
        }
    }
};