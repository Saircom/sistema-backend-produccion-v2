import db from '../config/db.js';

const enabled = () => String(process.env.WHATSAPP_ENABLED || '').trim().toLowerCase() === 'true';

const normalizePhone = value => {
    let digits = String(value || '').replace(/\D/g, '');
    const countryCode = String(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '51').replace(/\D/g, '');
    if (digits.length === 9) digits = `${countryCode}${digits}`;
    return /^\d{10,15}$/.test(digits) ? digits : null;
};

const formatDate = value => new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short'
}).format(new Date(value));

const getRecipients = async idOt => {
    const [rows] = await db.query(`
        SELECT DISTINCT u.id_usuario,u.nombres,u.apellidos,u.celular,
            ot.id_ot,ot.fecha_programada,cl.razon_social cliente
        FROM asignaciones_tecnicos a
        JOIN usuarios u ON u.id_usuario=a.id_usuario
        JOIN roles r ON r.id_rol=u.id_rol
        JOIN ordenes_trabajo ot ON ot.id_ot=a.id_ot
        JOIN cotizaciones c ON c.id_cotizacion=ot.id_cotizacion
        JOIN clientes cl ON cl.id_cliente=c.id_cliente
        WHERE a.id_ot=? AND u.estado=1
          AND UPPER(TRIM(r.nombre_rol))='TECNICO'`, [idOt]);
    return rows;
};

const sendTemplate = async recipient => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const graphVersion = process.env.WHATSAPP_GRAPH_VERSION;
    const templateName = process.env.WHATSAPP_OT_TEMPLATE_NAME;
    const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
    if (!token || !phoneNumberId || !graphVersion || !templateName) {
        throw new Error('Configuración de WhatsApp incompleta');
    }

    const phone = normalizePhone(recipient.celular);
    if (!phone) throw new Error('El técnico no tiene un celular válido');

    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                components: [{
                    type: 'body',
                    parameters: [
                        { type: 'text', text: String(recipient.nombres || 'Técnico') },
                        { type: 'text', text: `OT-${recipient.id_ot}` },
                        { type: 'text', text: String(recipient.cliente || 'Cliente') },
                        { type: 'text', text: formatDate(recipient.fecha_programada) }
                    ]
                }]
            }
        })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `WhatsApp respondió ${response.status}`);
    return data.messages?.[0]?.id || null;
};

export const WhatsAppService = {
    async notifyOtAssignment(idOt) {
        if (!enabled()) return { habilitado: false, enviados: 0, omitidos: 0, errores: [] };

        const recipients = await getRecipients(idOt);
        const results = await Promise.allSettled(recipients.map(sendTemplate));
        const errors = results.flatMap((result, index) => result.status === 'rejected' ? [{
            id_usuario: recipients[index].id_usuario,
            tecnico: `${recipients[index].nombres} ${recipients[index].apellidos}`.trim(),
            motivo: result.reason?.message || 'No se pudo enviar'
        }] : []);

        return {
            habilitado: true,
            enviados: results.filter(result => result.status === 'fulfilled').length,
            omitidos: errors.length,
            errores: errors
        };
    }
};
