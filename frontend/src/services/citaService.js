import api from './api';

export const citaService = {
  // Fetch all appointments based on user role and context
  async getCitas() {
    const { data } = await api.get('/citas');
    return data;
  },

  // Create a new appointment
  async createCita(citaData) {
    const { data } = await api.post('/citas', citaData);
    return data;
  },

  // Update existing appointment dates/times or details
  async updateCita(id, citaData) {
    const { data } = await api.put(`/citas/${id}`, citaData);
    return data;
  },

  // Soft-cancel an appointment
  async deleteCita(id) {
    const { data } = await api.delete(`/citas/${id}`);
    return data;
  },

  // Mark patient check-in (starts EN_PROCESO session)
  async checkIn(id) {
    const { data } = await api.post(`/citas/${id}/check-in`);
    return data;
  },

  // Mark patient check-out
  async checkOut(id) {
    const { data } = await api.post(`/citas/${id}/check-out`);
    return data;
  },

  // Close appointment with treatment, notes, indications, etc.
  async cerrarCita(id, closurePayload) {
    const { data } = await api.post(`/citas/${id}/cerrar`, closurePayload);
    return data;
  },

  // Get service contracts for a patient
  async getServiciosContratados(pacienteId) {
    const { data } = await api.get(`/servicios/contratados/${pacienteId}`);
    return data;
  }
};
