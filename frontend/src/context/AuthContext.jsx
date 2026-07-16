import React, { createContext, useContext, useState, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  // Recuperar usuario desde localStorage al cargar la app
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('fisioplus_user');

    if (savedUser) {
      return JSON.parse(savedUser);
    }

    return null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // LOGIN
  const login = useCallback(async (username, password) => {

    setLoading(true);
    setError(null);

    try {

      const data = await authService.login(username, password);

      // Objeto de usuario limpio
      const userData = {
        userId: data.user_id,
        username: data.username,
        rol: data.rol,
        clinicaId: data.clinica_id,
        alias: data.alias,
      };

      // Guardar en localStorage
      localStorage.setItem(
        'fisioplus_user',
        JSON.stringify(userData)
      );

      // Guardar en estado global
      setUser(userData);

      return data;

    } catch (err) {

      const msg =
        err.response?.data?.error ||
        'Error al iniciar sesión';

      setError(msg);

      throw err;

    } finally {

      setLoading(false);

    }

  }, []);

  // LOGOUT
  const logout = useCallback(() => {

    // Limpiar localStorage
    localStorage.removeItem('fisioplus_user');

    // Limpiar tokens si authService los maneja
    authService.logout();

    // Limpiar estado
    setUser(null);

  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        error,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado
export function useAuth() {

  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return ctx;
}