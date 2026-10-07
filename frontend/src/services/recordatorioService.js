import api from './api';

/**
 * Servicio frontend para el módulo de recordatorios y confirmación de citas.
 * Las rutas de acción (confirmar/cancelar/reagendar) son públicas (no requieren JWT).
 * Los toasts y la decisión del fisio requieren JWT.
 */
const recordatorioService = {

  /**
   * Obtiene el estado actual de un token de acción.
   * Llamar SIEMPRE primero antes de mostrar la UI de acciones.
   */
  getEstadoToken: (token) => api.get(`/api/recordatorios/token/${token}`),

  /** Confirma la cita. Idempotente. */
  confirmar: (token) => api.post(`/api/recordatorios/confirmar/${token}`),

  /** Cancela la cita. Idempotente. */
  cancelar: (token) => api.post(`/api/recordatorios/cancelar/${token}`),

  /**
   * Solicita reagendar la cita.
   * @param {string} token - Token de acción.
   * @param {string} nuevaFechaInicio - ISO 8601, ej: "2025-12-01T10:00:00".
   * @param {string} nuevaFechaFin    - ISO 8601, ej: "2025-12-01T11:00:00".
   */
  reagendar: (token, nuevaFechaInicio, nuevaFechaFin) =>
    api.post(`/api/recordatorios/reagendar/${token}`, { nuevaFechaInicio, nuevaFechaFin }),

  /**
   * El fisioterapeuta acepta o rechaza un reagendamiento.
   * Requiere JWT de FISIOTERAPEUTA.
   * @param {string} token    - Token de acción.
   * @param {string} decision - "ACEPTADA" | "RECHAZADA".
   */
  decisionFisio: (token, decision) =>
    api.post(`/api/recordatorios/decision-fisio/${token}`, { decision }),

  /**
   * Obtiene los toasts pendientes para el paciente autenticado.
   * Llamar en el login/mount del portal del paciente.
   * Requiere JWT de PACIENTE.
   */
  getToasts: () => api.get('/api/recordatorios/toasts'),

  /**
   * Obtiene el estado de notificaciones de una cita. Para uso del ADMIN.
   * @param {number} citaId - ID de la cita.
   */
  getNotificacionesCita: (citaId) =>
    api.get(`/api/recordatorios/admin/notificaciones?citaId=${citaId}`),

  /**
   * Fuerza el envío del recordatorio para una cita (solo ADMIN, para pruebas).
   * @param {number} citaId - ID de la cita.
   */
  forzarRecordatorio: (citaId) =>
    api.post(`/api/recordatorios/debug/forzar/${citaId}`),
};

export default recordatorioService;
