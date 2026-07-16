import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import QrSimulator from '../components/QrSimulator';
import {
  LayoutDashboard, Users, Stethoscope, Calendar, ClipboardList,
  PlusCircle, Trash2, Loader2, RefreshCw, QrCode, ToggleLeft, ToggleRight,
  Building, Clock, Save, Edit, AlertCircle, Check, Settings
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/admin/dashboard',         label: 'Dashboard',         icon: LayoutDashboard },
  { path: '/admin/fisioterapeutas',   label: 'Fisioterapeutas',   icon: Stethoscope },
  { path: '/admin/pacientes',         label: 'Pacientes',         icon: Users },
  { path: '/admin/servicios',         label: 'Catálogo Servicios', icon: ClipboardList },
  { path: '/admin/agenda',            label: 'Agenda',            icon: Calendar },
  { path: '/admin/configuracion',     label: 'Configuración',     icon: Settings },
];

// ---- Helpers ----
function LoadingSpinner() {
  return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-medical-500" /></div>;
}

function StatCard({ label, value, icon: Icon, color = 'text-medical-600', bg = 'bg-medical-50' }) {
  const safeValue = (() => {
    if (value === null || value === undefined) return '–';
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'object') return '?'; // nunca renderiza un objeto
    return value;
  })();

  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`p-3.5 rounded-2xl ${bg} ${color}`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{safeValue}</p>
      </div>
    </div>
  );
}

// ---- Dashboard ----
function DashboardView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
  api.get('/dashboard').then(r => {
    console.log('=== DASHBOARD RESPONSE ===', JSON.stringify(r.data, null, 2));
    setData(r.data);
    setLoading(false);
  }).catch(() => setLoading(false));
}, []);
  if (loading) return <LoadingSpinner />;
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="page-header">
        <div><h1 className="page-title">Dashboard de Clínica</h1><p className="page-subtitle">Métricas operativas de tu clínica</p></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pacientes"       value={data?.totalPacientes ?? 0}        icon={Users}         color="text-teal-600"   bg="bg-teal-50" />
          <StatCard label="Fisioterapeutas" value={data?.totalFisioterapeutas ?? 0}   icon={Stethoscope}   color="text-indigo-600" bg="bg-indigo-50" />
          <StatCard label="Citas Hoy"       value={Array.isArray(data?.citasHoy) ? data.citasHoy.length : (data?.totalCitasHoy ?? 0)} icon={Calendar} color="text-amber-600" bg="bg-amber-50" />
          <StatCard label="Servicios"       value={data?.totalServicios ?? 0}         icon={ClipboardList} color="text-blue-600"   bg="bg-blue-50" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <h3 className="font-bold text-slate-800 mb-4">Próximas Citas</h3>
          {(Array.isArray(data?.citasHoy) ? data.citasHoy : []).length === 0
  ? <p className="text-sm text-slate-400 text-center py-6">Sin citas hoy</p>
  : <div className="space-y-3">
      {data.citasHoy.slice(0, 5).map(c => (
        <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Sesión #{c.numeroSesion} — Cita #{c.id}
            </p>
            <p className="text-xs text-slate-400">
              {new Date(c.fechaInicio).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' })}
            </p>
          </div>
          <StatusBadge status={c.estatus} />
        </div>
      ))}
    </div>
}
        </div>
        <div className="card p-6">
          <h3 className="font-bold text-slate-800 mb-4">Citas por Estatus (Hoy)</h3>
          <div className="space-y-3">
            {[
              { label: 'Programadas', count: data?.statusCounts?.PROGRAMADA  || 0, color: 'bg-blue-200' },
              { label: 'En Proceso',  count: data?.statusCounts?.EN_PROCESO  || 0, color: 'bg-amber-200' },
              { label: 'Terminadas',  count: data?.statusCounts?.TERMINADA   || 0, color: 'bg-emerald-200' },
              { label: 'Canceladas',  count: data?.statusCounts?.CANCELADA   || 0, color: 'bg-rose-200' },
            ].map(s => {
              const total = data?.totalCitasHoy || 1;
              const pct = Math.round((s.count / total) * 100) || 0;
              return (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-600">{s.label}</span>
                    <span className="text-slate-400">{s.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`${s.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Fisioterapeutas ----
function FisioterapeutasView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nombre: '', apellidoPaterno: '', apellidoMaterno: '', email: '', telefono: '', cedula: '' });

  const load = () => { setLoading(true); api.get('/fisioterapeutas').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setError(null);
    try {
      await api.post('/fisioterapeutas', form);
      setShowForm(false); setForm({ nombre:'', apellidoPaterno:'', apellidoMaterno:'', email:'', telefono:'', cedula:'' }); load();
    } catch (err) { setError(err.response?.data?.error || 'Error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => { if (!confirm('¿Eliminar fisioterapeuta?')) return; await api.delete(`/fisioterapeutas/${id}`); load(); };

  const handleToggleEstatus = async (fisio) => {
    const nuevoEstatus = fisio.estatus === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const accion = nuevoEstatus === 'INACTIVO' ? 'desactivar' : 'activar';
    if (!confirm(`¿Deseas ${accion} a ${fisio.nombre} ${fisio.apellidoPaterno}?`)) return;
    try {
      await api.put(`/fisioterapeutas/${fisio.id}`, { ...fisio, estatus: nuevoEstatus });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cambiar estatus');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="page-header">
        <div><h1 className="page-title">Fisioterapeutas</h1><p className="page-subtitle">Gestión del equipo clínico</p></div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary"><PlusCircle className="w-4 h-4" /> Nuevo</button>
        </div>
      </div>

      {showForm && (
        <div className="card p-6 border-medical-100 border animate-fadeIn">
          <h3 className="font-bold text-slate-800 mb-4">Registrar Fisioterapeuta</h3>
          {error && <div className="mb-3 p-3 bg-rose-50 text-rose-700 text-sm rounded-xl">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name:'nombre', label:'Nombre', required:true },
              { name:'apellidoPaterno', label:'Apellido Paterno', required:true },
              { name:'apellidoMaterno', label:'Apellido Materno' },
              { name:'email', label:'Email', type:'email', required:true },
              { name:'telefono', label:'Teléfono' },
              { name:'cedula', label:'Cédula Profesional' },
            ].map(f => (
              <div key={f.name}>
                <label className="form-label">{f.label}{f.required && <span className="text-rose-500 ml-0.5">*</span>}</label>
                <input type={f.type||'text'} value={form[f.name]} onChange={e => setForm(p => ({...p, [f.name]: e.target.value}))} required={f.required} className="form-input" />
              </div>
            ))}
            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />} Crear</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <LoadingSpinner /> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="text-left py-3 px-4">Nombre</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Teléfono</th>
                <th className="text-left py-3 px-4">Cédula</th>
                <th className="text-left py-3 px-4">Estatus</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {items.map(f => (
                  <tr key={f.id} className={`hover:bg-slate-50/50 transition ${f.estatus === 'INACTIVO' ? 'opacity-60' : ''}`}>
                    <td className="py-3 px-4 font-semibold text-slate-800">{`${f.nombre} ${f.apellidoPaterno} ${f.apellidoMaterno || ''}`}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{f.email}</td>
                    <td className="py-3 px-4 text-slate-500">{f.telefono || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{f.cedula || '—'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={f.estatus || 'ACTIVO'} />
                    </td>
                    <td className="py-3 px-4 text-center flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleToggleEstatus(f)}
                        title={f.estatus === 'ACTIVO' ? 'Desactivar fisioterapeuta' : 'Activar fisioterapeuta'}
                        className={`p-1.5 rounded-lg transition ${f.estatus === 'ACTIVO' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                      >
                        {f.estatus === 'ACTIVO' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Pacientes ----
function PacientesView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nombre:'', apellidoPaterno:'', apellidoMaterno:'', email:'', telefono:'', fechaNacimiento:'', sexo:'MASCULINO' });

  const load = () => { setLoading(true); api.get('/pacientes').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setError(null);
    try { await api.post('/pacientes', form); setShowForm(false); setForm({ nombre:'', apellidoPaterno:'', apellidoMaterno:'', email:'', telefono:'', fechaNacimiento:'', sexo:'MASCULINO' }); load(); }
    catch (err) { setError(err.response?.data?.error || 'Error'); } finally { setSubmitting(false); }
  };

  const handleToggleEstatus = async (paciente) => {
    const nuevoEstatus = paciente.estatus === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const accion = nuevoEstatus === 'INACTIVO' ? 'desactivar' : 'activar';
    if (!confirm(`¿Deseas ${accion} a ${paciente.nombre} ${paciente.apellidoPaterno}?`)) return;
    try {
      await api.put(`/pacientes/${paciente.id}`, { ...paciente, estatus: nuevoEstatus });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cambiar estatus');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="page-header">
        <div><h1 className="page-title">Pacientes</h1><p className="page-subtitle">Base de datos de pacientes de la clínica</p></div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary"><PlusCircle className="w-4 h-4" /> Nuevo Paciente</button>
        </div>
      </div>

      {showForm && (
        <div className="card p-6 border-medical-100 border animate-fadeIn">
          <h3 className="font-bold text-slate-800 mb-4">Registrar Paciente</h3>
          {error && <div className="mb-3 p-3 bg-rose-50 text-rose-700 text-sm rounded-xl">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name:'nombre', label:'Nombre', required:true },
              { name:'apellidoPaterno', label:'Apellido Paterno', required:true },
              { name:'apellidoMaterno', label:'Apellido Materno' },
              { name:'email', label:'Email', type:'email', required:true },
              { name:'telefono', label:'Teléfono' },
              { name:'fechaNacimiento', label:'Fecha de Nacimiento', type:'date' },
            ].map(f => (
              <div key={f.name}>
                <label className="form-label">{f.label}{f.required && <span className="text-rose-500 ml-0.5">*</span>}</label>
                <input type={f.type||'text'} value={form[f.name]} onChange={e => setForm(p => ({...p, [f.name]: e.target.value}))} required={f.required} className="form-input" />
              </div>
            ))}
            <div>
              <label className="form-label">Sexo <span className="text-rose-500">*</span></label>
              <select value={form.sexo} onChange={e => setForm(p => ({...p, sexo: e.target.value}))} className="form-select">
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />} Crear Paciente</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <LoadingSpinner /> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="text-left py-3 px-4">Paciente</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Teléfono</th>
                <th className="text-left py-3 px-4">Sexo</th>
                <th className="text-left py-3 px-4">Estatus</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {items.map(p => (
                  <tr key={p.id} className={`hover:bg-slate-50/50 transition ${p.estatus === 'INACTIVO' ? 'opacity-60' : ''}`}>
                    <td className="py-3 px-4 font-semibold text-slate-800">{`${p.nombre} ${p.apellidoPaterno} ${p.apellidoMaterno || ''}`}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{p.email}</td>
                    <td className="py-3 px-4 text-slate-500">{p.telefono || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{p.sexo || p.genero || '—'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.estatus || 'ACTIVO'} />
                    </td>
                    <td className="py-3 px-4 text-center flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleToggleEstatus(p)}
                        title={p.estatus === 'ACTIVO' ? 'Desactivar paciente' : 'Activar paciente'}
                        className={`p-1.5 rounded-lg transition ${p.estatus === 'ACTIVO' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                      >
                        {p.estatus === 'ACTIVO' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Servicios ----
function ServiciosView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nombre:'', descripcion:'', duracionMinutos:60, precio:0.0 });

  const load = () => { setLoading(true); api.get('/servicios').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setError(null);
    try { await api.post('/servicios', form); setShowForm(false); setForm({ nombre:'', descripcion:'', duracionMinutos:60, precio:0.0 }); load(); }
    catch (err) { setError(err.response?.data?.error || 'Error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => { if (!confirm('¿Eliminar servicio?')) return; await api.delete(`/servicios/${id}`); load(); };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="page-header">
        <div><h1 className="page-title">Catálogo de Servicios</h1><p className="page-subtitle">Tratamientos y servicios ofrecidos por la clínica</p></div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary"><PlusCircle className="w-4 h-4" /> Nuevo Servicio</button>
        </div>
      </div>

      {showForm && (
        <div className="card p-6 border-medical-100 border animate-fadeIn">
          <h3 className="font-bold text-slate-800 mb-4">Agregar Servicio</h3>
          {error && <div className="mb-3 p-3 bg-rose-50 text-rose-700 text-sm rounded-xl">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Nombre del Servicio <span className="text-rose-500">*</span></label>
              <input type="text" value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} required className="form-input" placeholder="Masaje Descontracturante" />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Descripción</label>
              <textarea value={form.descripcion} onChange={e => setForm(p => ({...p, descripcion: e.target.value}))} rows={2} className="form-input resize-none" placeholder="Descripción breve del servicio..." />
            </div>
            <div>
              <label className="form-label">Duración (minutos) <span className="text-rose-500">*</span></label>
              <input type="number" min="10" value={form.duracionMinutos} onChange={e => setForm(p => ({...p, duracionMinutos: e.target.value}))} required className="form-input" />
            </div>
            <div>
              <label className="form-label">Precio (MXN) <span className="text-rose-500">*</span></label>
              <input type="number" min="0" step="0.01" value={form.precio} onChange={e => setForm(p => ({...p, precio: e.target.value}))} required className="form-input" />
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />} Crear Servicio</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <LoadingSpinner /> : items.map(s => (
          <div key={s.id} className="card-hover p-5 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-bold text-slate-800">{s.nombre}</h4>
              <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-400 flex-1">{s.descripcion || 'Sin descripción'}</p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500">{s.duracionMinutos} min</span>
              <span className="font-bold text-medical-600">${Number(s.precio).toFixed(2)} MXN</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Agenda ----
function AgendaView() {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrCita, setQrCita] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fisios, setFisios] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [filterEstatus, setFilterEstatus] = useState('ALL');
  const [form, setForm] = useState({ fisioterapeutaId:'', pacienteId:'', servicioId:'', fechaInicio:'', notas:'' });

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/citas'),
      api.get('/fisioterapeutas'),
      api.get('/pacientes'),
      api.get('/servicios'),
    ]).then(([c, f, p, s]) => {
      setCitas(c.data); setFisios(f.data); setPacientes(p.data); setServicios(s.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(loadAll, [loadAll]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setError(null);
    try { await api.post('/citas', { ...form, fisioterapeutaId: +form.fisioterapeutaId, pacienteId: +form.pacienteId, servicioId: +form.servicioId }); setShowForm(false); setForm({ fisioterapeutaId:'', pacienteId:'', servicioId:'', fechaInicio:'', notas:'' }); loadAll(); }
    catch (err) { setError(err.response?.data?.error || 'Error al agendar'); } finally { setSubmitting(false); }
  };

  const handleCancel = async (id) => { if (!confirm('¿Cancelar esta cita?')) return; await api.put(`/citas/${id}/cancelar`); loadAll(); };

  const filtered = filterEstatus === 'ALL' ? citas : citas.filter(c => c.estatus === filterEstatus);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="page-header">
        <div><h1 className="page-title">Agenda de Citas</h1><p className="page-subtitle">Programación y seguimiento de sesiones</p></div>
        <div className="flex gap-2">
          <button onClick={loadAll} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary"><PlusCircle className="w-4 h-4" /> Nueva Cita</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['ALL','PROGRAMADA','EN_PROCESO','TERMINADA','CANCELADA'].map(s => (
          <button key={s} onClick={() => setFilterEstatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${filterEstatus === s ? 'bg-medical-600 text-white border-medical-600' : 'bg-white text-slate-500 border-slate-200 hover:border-medical-200'}`}>
            {s === 'ALL' ? 'Todas' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card p-6 border-medical-100 border animate-fadeIn">
          <h3 className="font-bold text-slate-800 mb-4">Nueva Cita</h3>
          {error && <div className="mb-3 p-3 bg-rose-50 text-rose-700 text-sm rounded-xl">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Fisioterapeuta <span className="text-rose-500">*</span></label>
              <select value={form.fisioterapeutaId} onChange={e => setForm(p => ({...p, fisioterapeutaId: e.target.value}))} required className="form-select">
                <option value="">Seleccionar...</option>
                {fisios.map(f => <option key={f.id} value={f.id}>{f.nombre} {f.apellidoPaterno}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Paciente <span className="text-rose-500">*</span></label>
              <select value={form.pacienteId} onChange={e => setForm(p => ({...p, pacienteId: e.target.value}))} required className="form-select">
                <option value="">Seleccionar...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidoPaterno}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Servicio <span className="text-rose-500">*</span></label>
              <select value={form.servicioId} onChange={e => setForm(p => ({...p, servicioId: e.target.value}))} required className="form-select">
                <option value="">Seleccionar...</option>
                {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.duracionMinutos} min)</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Fecha y Hora <span className="text-rose-500">*</span></label>
              <input type="datetime-local" value={form.fechaInicio} onChange={e => setForm(p => ({...p, fechaInicio: e.target.value}))} required className="form-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Notas</label>
              <textarea value={form.notas} onChange={e => setForm(p => ({...p, notas: e.target.value}))} rows={2} className="form-input resize-none" placeholder="Indicaciones previas, notas especiales..." />
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />} Agendar</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <LoadingSpinner /> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="text-left py-3 px-4">#</th>
                <th className="text-left py-3 px-4">Paciente</th>
                <th className="text-left py-3 px-4">Fisioterapeuta</th>
                <th className="text-left py-3 px-4">Servicio</th>
                <th className="text-left py-3 px-4">Fecha/Hora</th>
                <th className="text-left py-3 px-4">Estatus</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs">{c.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {c.paciente || c.pacienteNombre || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {c.fisioterapeuta || c.fisioterapeutaNombre || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {c.servicio || c.servicioNombre || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{c.fechaInicio ? new Date(c.fechaInicio).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' }) : '—'}</td>
                    <td className="py-3 px-4"><StatusBadge status={c.estatus} /></td>
                    <td className="py-3 px-4 text-center flex items-center justify-center gap-1.5">
                      <button onClick={() => setQrCita(c)} className="p-1.5 rounded-lg text-medical-500 hover:bg-medical-50 transition" title="QR Check-in">
                        <QrCode className="w-4 h-4" />
                      </button>
                      {c.estatus === 'PROGRAMADA' && (
                        <button onClick={() => handleCancel(c.id)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 transition" title="Cancelar cita">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {qrCita && <QrSimulator cita={qrCita} onClose={() => setQrCita(null)} onUpdated={loadAll} />}
    </div>
  );
}

function ConfiguracionView() {
  const [loading, setLoading] = useState(true);
  const [submittingInfo, setSubmittingInfo] = useState(false);
  const [submittingHorarios, setSubmittingHorarios] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [clinicInfo, setClinicInfo] = useState({
    nombreClinica: '',
    direccion: '',
    telefono: '',
    ciudad: '',
    estado: '',
    pais: '',
    pacientesPorHora: 4
  });

  const [horarios, setHorarios] = useState([]);
  const [editInfo, setEditInfo] = useState(false);
  const [editHorarios, setEditHorarios] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/clinicas/mi-clinica'),
      api.get('/clinicas/mi-clinica/horarios')
    ]).then(([resClinica, resHorarios]) => {
      setClinicInfo(resClinica.data);
      
      // Sort horarios by DiaSemana
      const order = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      const sortedHorarios = [...resHorarios.data].sort((a, b) => {
        return order.indexOf(a.diaSemana) - order.indexOf(b.diaSemana);
      });
      setHorarios(sortedHorarios);
      setLoading(false);
    }).catch(err => {
      setError('Error al cargar la configuración de la clínica');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInfoChange = (e) => {
    setClinicInfo(c => ({ ...c, [e.target.name]: e.target.value }));
  };

  const handleHorarioChange = (index, field, value) => {
    setHorarios(list => list.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    setSubmittingInfo(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const { data } = await api.put('/clinicas/mi-clinica', clinicInfo);
      setClinicInfo(data);
      setSuccessMsg('Información de la clínica actualizada correctamente');
      setEditInfo(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar la información');
    } finally {
      setSubmittingInfo(false);
    }
  };

  const handleHorariosSubmit = async (e) => {
    e.preventDefault();
    setSubmittingHorarios(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = horarios.map(h => ({
        diaSemana: h.diaSemana,
        apertura: h.apertura.substring(0, 5),
        cierre: h.cierre.substring(0, 5),
        cerrado: h.cerrado
      }));
      await api.put('/clinicas/mi-clinica/horarios', payload);
      setSuccessMsg('Horarios operativos actualizados correctamente');
      setEditHorarios(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar los horarios');
    } finally {
      setSubmittingHorarios(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración de la Clínica</h1>
          <p className="page-subtitle">Gestiona la información comercial y el horario operativo de tu sucursal</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-700 font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Datos de la Clínica */}
        <div className="card p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Building className="w-5 h-5 text-medical-600" /> Datos Generales
            </h3>
            {!editInfo && (
              <button 
                type="button"
                onClick={() => setEditInfo(true)} 
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" /> Editar
              </button>
            )}
          </div>

          <form onSubmit={handleInfoSubmit} className="space-y-4">
            <div>
              <label className="form-label">Nombre de la Clínica</label>
              <input 
                type="text" 
                name="nombreClinica" 
                value={clinicInfo.nombreClinica || ''} 
                onChange={handleInfoChange}
                disabled={!editInfo}
                className="form-input" 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Teléfono</label>
                <input 
                  type="text" 
                  name="telefono" 
                  value={clinicInfo.telefono || ''} 
                  onChange={handleInfoChange}
                  disabled={!editInfo}
                  className="form-input" 
                />
              </div>
              <div>
                <label className="form-label">Pacientes por hora</label>
                <input 
                  type="number" 
                  name="pacientesPorHora" 
                  value={clinicInfo.pacientesPorHora ?? 4} 
                  onChange={handleInfoChange}
                  disabled={!editInfo}
                  className="form-input" 
                  min="1"
                  max="20"
                  required 
                />
              </div>
            </div>

            <div>
              <label className="form-label">Dirección</label>
              <input 
                type="text" 
                name="direccion" 
                value={clinicInfo.direccion || ''} 
                onChange={handleInfoChange}
                disabled={!editInfo}
                className="form-input" 
                required 
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Ciudad</label>
                <input 
                  type="text" 
                  name="ciudad" 
                  value={clinicInfo.ciudad || ''} 
                  onChange={handleInfoChange}
                  disabled={!editInfo}
                  className="form-input" 
                />
              </div>
              <div>
                <label className="form-label">Estado</label>
                <input 
                  type="text" 
                  name="estado" 
                  value={clinicInfo.estado || ''} 
                  onChange={handleInfoChange}
                  disabled={!editInfo}
                  className="form-input" 
                />
              </div>
              <div>
                <label className="form-label">País</label>
                <input 
                  type="text" 
                  name="pais" 
                  value={clinicInfo.pais || ''} 
                  onChange={handleInfoChange}
                  disabled={!editInfo}
                  className="form-input" 
                />
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-400">
              <p>Email Registrado: <span className="font-mono font-semibold text-slate-600">{clinicInfo.email}</span></p>
              <p className="mt-1">Tipo de Registro: <span className="font-semibold text-medical-600 uppercase text-[10px] bg-medical-50 px-1.5 py-0.5 rounded">{clinicInfo.tipoRegistro}</span></p>
            </div>

            {editInfo && (
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submittingInfo} className="btn-primary py-2 px-4 flex items-center gap-2 text-sm">
                  {submittingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Cambios
                </button>
                <button 
                  type="button" 
                  onClick={() => { setEditInfo(false); loadData(); }} 
                  className="btn-secondary py-2 px-4 text-sm"
                >
                  Cancelar
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Horarios de la Clínica */}
        <div className="card p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" /> Horario Operativo
            </h3>
            {!editHorarios && horarios.length > 0 && (
              <button 
                type="button"
                onClick={() => setEditHorarios(true)} 
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" /> Editar
              </button>
            )}
          </div>

          <form onSubmit={handleHorariosSubmit} className="space-y-4">
            {horarios.length === 0 ? (
              <div className="text-center py-8 flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
                <Clock className="w-8 h-8 text-slate-300 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-600">No has establecido horarios para tu clínica</p>
                  <p className="text-xs text-slate-400">Configura tus horas de apertura y cierre semanales para comenzar</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHorarios([
                      { diaSemana: 'Lunes', apertura: '08:00', cierre: '20:00', cerrado: false },
                      { diaSemana: 'Martes', apertura: '08:00', cierre: '20:00', cerrado: false },
                      { diaSemana: 'Miércoles', apertura: '08:00', cierre: '20:00', cerrado: false },
                      { diaSemana: 'Jueves', apertura: '08:00', cierre: '20:00', cerrado: false },
                      { diaSemana: 'Viernes', apertura: '08:00', cierre: '20:00', cerrado: false },
                      { diaSemana: 'Sábado', apertura: '08:00', cierre: '14:00', cerrado: false },
                      { diaSemana: 'Domingo', apertura: '08:00', cierre: '18:00', cerrado: true }
                    ]);
                    setEditHorarios(true);
                  }}
                  className="btn-primary py-2 px-4 text-xs font-bold"
                >
                  Establecer horarios
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {horarios.map((h, i) => (
                    <div key={h.id || h.diaSemana} className="flex items-center justify-between gap-4 p-3 bg-slate-50/50 rounded-xl border border-slate-100 shadow-sm text-sm">
                      <span className="font-semibold text-slate-700 w-24">{h.diaSemana}</span>

                      <div className="flex items-center gap-2 flex-1 justify-end">
                        {!h.cerrado ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={h.apertura.substring(0, 5)}
                              disabled={!editHorarios}
                              onChange={(e) => handleHorarioChange(i, 'apertura', e.target.value)}
                              className="border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-xs text-slate-600 focus:outline-none focus:border-medical-500 disabled:opacity-70 disabled:bg-slate-50"
                            />
                            <span className="text-xs text-slate-400">a</span>
                            <input
                              type="time"
                              value={h.cierre.substring(0, 5)}
                              disabled={!editHorarios}
                              onChange={(e) => handleHorarioChange(i, 'cierre', e.target.value)}
                              className="border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-xs text-slate-600 focus:outline-none focus:border-medical-500 disabled:opacity-70 disabled:bg-slate-50"
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full uppercase border border-rose-100 tracking-wide mr-2">Cerrado</span>
                        )}

                        {editHorarios ? (
                          <button
                            type="button"
                            onClick={() => handleHorarioChange(i, 'cerrado', !h.cerrado)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition ${h.cerrado ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                          >
                            {h.cerrado ? 'Cerrado' : 'Abierto'}
                          </button>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${h.cerrado ? 'text-rose-400 bg-rose-50/20' : 'text-emerald-500 bg-emerald-50/20'}`}>
                            {h.cerrado ? 'Inactivo' : 'Activo'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {editHorarios && (
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={submittingHorarios} className="btn-primary py-2 px-4 flex items-center gap-2 text-sm">
                      {submittingHorarios ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Horarios
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setEditHorarios(false); loadData(); }} 
                      className="btn-secondary py-2 px-4 text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </>
            )}
          </form>
        </div>

      </div>
    </div>
  );
}

export default function AdminPortal() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar navItems={NAV_ITEMS} portalLabel="Admin" />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <Routes>
          <Route path="dashboard"       element={<DashboardView />} />
          <Route path="fisioterapeutas" element={<FisioterapeutasView />} />
          <Route path="pacientes"       element={<PacientesView />} />
          <Route path="servicios"       element={<ServiciosView />} />
          <Route path="agenda"          element={<AgendaView />} />
          <Route path="configuracion"   element={<ConfiguracionView />} />
          <Route path="*"               element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
