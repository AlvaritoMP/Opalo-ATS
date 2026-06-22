// Nombre de tenant en la BD compartida (Opalo ATS / Opalopy / ATS Pro).
// En Easypanel: VITE_APP_NAME=Opalo ATS o VITE_APP_NAME=Opalopy según el deploy.
export const APP_NAME = import.meta.env.VITE_APP_NAME?.trim() || 'Opalo ATS';

