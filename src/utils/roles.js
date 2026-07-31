export const SUPERADMIN_ROLE = 'SUPERADMINISTRADOR';

export const normalizeRole = value => String(value?.rol ?? value ?? '').trim().toUpperCase();

export const isSuperAdmin = value => normalizeRole(value) === SUPERADMIN_ROLE;

export const hasAnyRole = (value, ...allowedRoles) => {
    if (isSuperAdmin(value)) return true;
    const role = normalizeRole(value);
    return allowedRoles.map(normalizeRole).includes(role);
};
