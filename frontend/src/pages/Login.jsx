import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { 
  Activity, Eye, EyeOff, AlertCircle, Info, ArrowLeft, 
  Building2, MapPin, Shield, Calendar, Clock, CheckCircle 
} from 'lucide-react';

import logo from '../portada.png'

const DEMO_USERS = [
  { rol: 'Super Admin', email: 'superadmin@fisioplus.com', password: 'superadmin', color: 'bg-rose-100 text-rose-700' },
  { rol: 'Admin (Clínica A)', email: 'admin@fisioplus.com', password: 'fisiopluscentro', color: 'bg-amber-100 text-amber-700' },
  { rol: 'Fisioterapeuta', email: 'svaldez@fisioplus.com', password: 'svaldez', color: 'bg-blue-100 text-blue-700' },
  { rol: 'Paciente', email: 'cmartinez@fisioplus.com', password: 'cmartinez', color: 'bg-emerald-100 text-emerald-700' },
];

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error, setError } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordAlert, setShowPasswordAlert] = useState(false);

  // New Registration states
  const [isRegistering, setIsRegistering] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [regForm, setRegForm] = useState({
    nombreClinica: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    estado: '',
    pais: 'México',
    pacientesPorHora: 4,
    password: '',
    confirmPassword: ''
  });
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regShowConfirmPassword, setRegShowConfirmPassword] = useState(false);
  const [regSuccess, setRegSuccess] = useState(null);
  const [horarios, setHorarios] = useState([
    { diaSemana: 'Lunes', apertura: '08:00', cierre: '20:00', cerrado: false },
    { diaSemana: 'Martes', apertura: '08:00', cierre: '20:00', cerrado: false },
    { diaSemana: 'Miércoles', apertura: '08:00', cierre: '20:00', cerrado: false },
    { diaSemana: 'Jueves', apertura: '08:00', cierre: '20:00', cerrado: false },
    { diaSemana: 'Viernes', apertura: '08:00', cierre: '20:00', cerrado: false },
    { diaSemana: 'Sábado', apertura: '08:00', cierre: '14:00', cerrado: false },
    { diaSemana: 'Domingo', apertura: '08:00', cierre: '18:00', cerrado: true }
  ]);

  const handleChange = (e) => {
    setError(null);
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleRegChange = (e) => {
    setError(null);
    setRegForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleHorarioChange = (index, field, value) => {
    setHorarios(list => list.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return;
    try {
      const data = await login(form.username, form.password);
      if (data.recommendPasswordChange) setShowPasswordAlert(true);
      else redirect(data.rol);
    } catch (_) {}
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (regForm.password !== regForm.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError(null);
    try {
      const payload = {
        ...regForm,
        horarios: horarios.map(h => ({
          ...h,
          cerrado: h.cerrado
        }))
      };
      
      await authService.registerClinic(payload);
      setRegSuccess('¡Clínica registrada con éxito! Ya puedes iniciar sesión con tu cuenta.');
      
      // Auto-fill login email and clear registration form
      setForm({ username: regForm.email, password: '' });
      setRegForm({
        nombreClinica: '',
        email: '',
        telefono: '',
        direccion: '',
        ciudad: '',
        estado: '',
        pais: 'México',
        pacientesPorHora: 4,
        password: '',
        confirmPassword: ''
      });
      setHorarios([
        { diaSemana: 'Lunes', apertura: '08:00', cierre: '20:00', cerrado: false },
        { diaSemana: 'Martes', apertura: '08:00', cierre: '20:00', cerrado: false },
        { diaSemana: 'Miércoles', apertura: '08:00', cierre: '20:00', cerrado: false },
        { diaSemana: 'Jueves', apertura: '08:00', cierre: '20:00', cerrado: false },
        { diaSemana: 'Viernes', apertura: '08:00', cierre: '20:00', cerrado: false },
        { diaSemana: 'Sábado', apertura: '08:00', cierre: '14:00', cerrado: false },
        { diaSemana: 'Domingo', apertura: '08:00', cierre: '18:00', cerrado: true }
      ]);
      
      setRegStep(1);
      setIsRegistering(false);
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al registrar la clínica';
      setError(msg);
    }
  };

  const redirect = (rol) => {
    const routes = { SUPER_ADMIN: '/superadmin', ADMIN: '/admin', FISIOTERAPEUTA: '/fisio', PACIENTE: '/paciente' };
    navigate(routes[rol] || '/login');
  };

  const fillDemo = (user) => {
    setError(null);
    setForm({ username: user.email, password: user.password });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Brand */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-medical-700 via-medical-600 to-indigo-700 flex-col justify-between p-12">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <span className="font-display font-bold text-3xl text-white tracking-tight">
              Fisio<span className="text-medical-200">Plus</span>
            </span>
          </div>

          <h1 className="text-4xl font-extrabold text-white font-display leading-snug mb-4">
            Digitaliza tu<br />Clínica de Fisioterapia
          </h1>
          <p className="text-medical-100 text-base leading-relaxed max-w-sm">
            Gestiona pacientes, agenda citas, registra valoraciones clínicas y controla el check-in de cada sesión con tecnología QR.
          </p>

          <img className="mt-5 w-[580px] h-auto" src={logo}/>
          
        </div>

        {/* Decorative blobs */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-500 rounded-full opacity-30 blur-3xl pointer-events-none" />
        <div className="absolute top-10 -right-10 w-56 h-56 bg-medical-400 rounded-full opacity-20 blur-2xl pointer-events-none" />

        <div className="relative z-10 text-medical-200 text-xs">
          FisioPlus © 2026
        </div>
      </div>

      {/* Right Panel — Login / Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8 overflow-y-auto">
        <div className="w-full max-w-md animate-fadeIn my-auto">

          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="p-2 bg-medical-100 rounded-xl text-medical-600">
              <Activity className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-2xl text-slate-800">
              Fisio<span className="text-medical-600">Plus</span>
            </span>
          </div>

          {/* Reg success banner */}
          {regSuccess && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Registro Exitoso</p>
                <p className="text-xs text-emerald-600 mt-0.5">{regSuccess}</p>
                <button
                  onClick={() => setRegSuccess(null)}
                  className="mt-2 text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}

          {/* Password Change Alert */}
          {showPasswordAlert && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Recomendación de Seguridad</p>
                <p className="text-xs text-amber-600 mt-0.5">Estás usando tu contraseña inicial. Te recomendamos cambiarla pronto para mayor seguridad.</p>
                <button
                  onClick={() => { setShowPasswordAlert(false); redirect(JSON.parse(localStorage.getItem('fisioplus_user')).rol); }}
                  className="mt-2 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
                >
                  Entendido, continuar →
                </button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <p className="text-sm text-rose-700 font-medium">{error}</p>
            </div>
          )}

          {!isRegistering ? (
            <>
              <h2 className="font-display font-bold text-2xl text-slate-800 mb-1">Iniciar sesión</h2>
              <p className="text-sm text-slate-400 mb-8">Accede a tu portal de gestión clínica</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="login-username" className="form-label">Correo electrónico</label>
                  <input
                    id="login-username"
                    type="email"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="usuario@correo.com"
                    className="form-input"
                    required
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="form-label">Contraseña</label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="form-input pr-10"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !form.username || !form.password}
                  className="btn-primary w-full justify-center py-3 text-base"
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <span className="text-sm text-slate-400">¿Eres una clínica nueva? </span>
                <button
                  onClick={() => { setIsRegistering(true); setError(null); setRegStep(1); }}
                  className="text-sm font-bold text-medical-600 hover:text-medical-700 transition"
                >
                  Registrarse aquí
                </button>
              </div>

              {/* Demo Credentials */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center mb-3">
                  Credenciales de Demo (Seeder)
                </p>
                <div className="space-y-2">
                  {DEMO_USERS.map(u => (
                    <button
                      key={u.email}
                      onClick={() => fillDemo(u)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-medical-200 hover:bg-medical-50 transition-all text-left"
                    >
                      <div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${u.color} uppercase tracking-wide`}>{u.rol}</span>
                        <p className="text-xs font-medium text-slate-600 mt-1 font-mono">{u.email}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{u.password}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => {
                    if (regStep > 1) setRegStep(s => s - 1);
                    else setIsRegistering(false);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-800">Registrar Clínica</h2>
                  <p className="text-xs text-slate-400">Paso {regStep} de 3</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-1 rounded-full mb-4">
                <div
                  className="bg-medical-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(regStep / 3) * 100}%` }}
                />
              </div>

              {regStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-medical-50/50 p-4 rounded-2xl border border-medical-100/50 flex gap-3 items-start mb-2">
                    <Building2 className="w-5 h-5 text-medical-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-medical-800 leading-relaxed">
                      Crea tu consultorio. El correo de contacto que indiques aquí será el usuario administrador de tu portal.
                    </p>
                  </div>
                  <div>
                    <label className="form-label">Nombre de la Clínica *</label>
                    <input
                      type="text"
                      name="nombreClinica"
                      value={regForm.nombreClinica}
                      onChange={handleRegChange}
                      placeholder="Ej. FisioPlus Centro"
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Correo de Contacto *</label>
                    <input
                      type="email"
                      name="email"
                      value={regForm.email}
                      onChange={handleRegChange}
                      placeholder="ejemplo@clinica.com"
                      className="form-input"
                      required                      
                    />
                  </div>
                  <div>
                    <label className="form-label">Teléfono</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={regForm.telefono}
                      onChange={handleRegChange}
                      placeholder="Ej. 555-1234"
                      className="form-input"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!regForm.nombreClinica || !regForm.email) {
                        setError('Por favor llena los campos obligatorios');
                        return;
                      }
                      setError(null);
                      setRegStep(2);
                    }}
                    className="btn-primary w-full justify-center py-2.5 text-sm mt-2"
                  >
                    Siguiente paso
                  </button>
                </div>
              )}

              {regStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 flex gap-3 items-start mb-2">
                    <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-800 leading-relaxed">
                      Completa la dirección de tu clínica y la capacidad de pacientes simultáneos por hora.
                    </p>
                  </div>
                  <div>
                    <label className="form-label">Dirección *</label>
                    <input
                      type="text"
                      name="direccion"
                      value={regForm.direccion}
                      onChange={handleRegChange}
                      placeholder="Calle, número, colonia..."
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Ciudad</label>
                      <input
                        type="text"
                        name="ciudad"
                        value={regForm.ciudad}
                        onChange={handleRegChange}
                        placeholder="Ciudad"
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Estado</label>
                      <input
                        type="text"
                        name="estado"
                        value={regForm.estado}
                        onChange={handleRegChange}
                        placeholder="Estado"
                        className="form-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">País</label>
                      <input
                        type="text"
                        name="pais"
                        value={regForm.pais}
                        onChange={handleRegChange}
                        placeholder="País"
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Pacientes por hora *</label>
                      <input
                        type="number"
                        name="pacientesPorHora"
                        value={regForm.pacientesPorHora}
                        onChange={handleRegChange}
                        min="1"
                        max="20"
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => setRegStep(1)}
                      className="btn-secondary flex-1 justify-center py-2.5 text-sm"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={() => {
                        if (!regForm.direccion) {
                          setError('Por favor indica la dirección de la clínica');
                          return;
                        }
                        setError(null);
                        setRegStep(3);
                      }}
                      className="btn-primary flex-1 justify-center py-2.5 text-sm"
                    >
                      Siguiente paso
                    </button>
                  </div>
                </div>
              )}

              {regStep === 3 && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 flex gap-3 items-start">
                    <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      Elige una contraseña de administrador y configura el horario de atención al público.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Contraseña *</label>
                      <div className="relative">
                        <input
                          type={regShowPassword ? 'text' : 'password'}
                          name="password"
                          value={regForm.password}
                          onChange={handleRegChange}
                          placeholder="••••••••"
                          className="form-input pr-8 text-sm"
                          required
                          minLength="6"
                        />
                        <button
                          type="button"
                          onClick={() => setRegShowPassword(v => !v)}
                          className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          {regShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Confirmar Contraseña *</label>
                      <div className="relative">
                        <input
                          type={regShowConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={regForm.confirmPassword}
                          onChange={handleRegChange}
                          placeholder="••••••••"
                          className="form-input pr-8 text-sm"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setRegShowConfirmPassword(v => !v)}
                          className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          {regShowConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Horario de Atención */}
                  <div>
                    <span className="form-label block mb-2 font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-medical-600" /> Horario Operativo Semanal
                    </span>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-52 overflow-y-auto bg-slate-50/50 p-2 space-y-2">
                      {horarios.map((h, i) => (
                        <div key={h.diaSemana} className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-xs">
                          <span className="font-semibold text-slate-700 w-16">{h.diaSemana}</span>
                          
                          <div className="flex items-center gap-1.5 flex-1 justify-end">
                            {!h.cerrado ? (
                              <>
                                <input
                                  type="time"
                                  value={h.apertura}
                                  onChange={(e) => handleHorarioChange(i, 'apertura', e.target.value)}
                                  className="border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50 text-[11px] focus:outline-none focus:border-medical-500"
                                />
                                <span className="text-[10px] text-slate-400">a</span>
                                <input
                                  type="time"
                                  value={h.cierre}
                                  onChange={(e) => handleHorarioChange(i, 'cierre', e.target.value)}
                                  className="border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50 text-[11px] focus:outline-none focus:border-medical-500"
                                />
                              </>
                            ) : (
                              <span className="text-[11px] font-bold text-rose-500 uppercase px-2">Cerrado</span>
                            )}
                            
                            <button
                              type="button"
                              onClick={() => handleHorarioChange(i, 'cerrado', !h.cerrado)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${h.cerrado ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                            >
                              {h.cerrado ? 'Cerrado' : 'Abierto'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(2)}
                      className="btn-secondary flex-1 justify-center py-2.5 text-sm"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !regForm.password || !regForm.confirmPassword}
                      className="btn-primary flex-1 justify-center py-2.5 text-sm"
                    >
                      {loading ? 'Registrando...' : 'Registrar Clínica'}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-4 text-center">
                <span className="text-sm text-slate-400">¿Ya tienes una cuenta? </span>
                <button
                  onClick={() => { setIsRegistering(false); setError(null); }}
                  className="text-sm font-bold text-medical-600 hover:text-medical-700 transition"
                >
                  Iniciar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
