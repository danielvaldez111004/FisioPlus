import api from './api';

export const authService = {
  async login(username, password) {
    const { data } = await api.post('/auth/login', { username, password });
    // Persist session
    localStorage.setItem('fisioplus_token', data.token);
    localStorage.setItem('fisioplus_user', JSON.stringify({
      userId: data.user_id,
      username: data.username,
      rol: data.rol,
      clinicaId: data.clinica_id,
      alias: data.alias,
    }));
    return data;
  },

  logout() {
    localStorage.removeItem('fisioplus_token');
    localStorage.removeItem('fisioplus_user');
  },

  getCurrentUser() {
    const raw = localStorage.getItem('fisioplus_user');
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('fisioplus_token');
  },

  async changePassword(newPassword) {
    const { data } = await api.post('/auth/change-password', { newPassword });
    return data;
  },

  async registerClinic(registrationData) {
    const { data } = await api.post('/auth/register-clinic', registrationData);
    return data;
  },
};
