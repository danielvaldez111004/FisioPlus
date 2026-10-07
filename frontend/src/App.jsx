import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import SuperAdminPortal from './pages/SuperAdminPortal';
import AdminPortal from './pages/AdminPortal';
import FisioPortal from './pages/FisioPortal';
import PacientePortal from './pages/PacientePortal';
import ConfirmarCita from './pages/ConfirmarCita';

// Route guard: redirects to login if not authenticated
function PrivateRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Smart redirect after login based on role
function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  switch (user.rol) {
    case 'SUPER_ADMIN':   return <Navigate to="/superadmin" replace />;
    case 'ADMIN':         return <Navigate to="/admin" replace />;
    case 'FISIOTERAPEUTA':return <Navigate to="/fisio" replace />;
    case 'PACIENTE':      return <Navigate to="/paciente" replace />;
    default:              return <Navigate to="/login" replace />;
  }
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleRedirect />} />

      <Route path="/superadmin/*" element={
        <PrivateRoute allowedRoles={['SUPER_ADMIN']}>
          <SuperAdminPortal />
        </PrivateRoute>
      } />

      <Route path="/admin/*" element={
        <PrivateRoute allowedRoles={['ADMIN']}>
          <AdminPortal />
        </PrivateRoute>
      } />

      <Route path="/fisio/*" element={
        <PrivateRoute allowedRoles={['FISIOTERAPEUTA']}>
          <FisioPortal />
        </PrivateRoute>
      } />

      <Route path="/paciente/*" element={
        <PrivateRoute allowedRoles={['PACIENTE']}>
          <PacientePortal />
        </PrivateRoute>
      } />

      {/* Ruta PÚBLICA del módulo de recordatorios — accedida desde email/WhatsApp sin login */}
      <Route path="/confirmar-cita/:token" element={<ConfirmarCita />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
