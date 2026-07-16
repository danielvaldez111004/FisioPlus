import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import { LayoutDashboard, Building2, Users, PlusCircle, Pencil, Trash2, Loader2, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../services/api';

const NAV_ITEMS = [
  { path: '/superadmin/dashboard', label: 'Dashboard Global', icon: LayoutDashboard },
  { path: '/superadmin/clinicas', label: 'Clínicas (Tenants)', icon: Building2 },
];

// ---- Dashboard View ----
function DashboardView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-medical-500" /></div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Global</h1>
          <p className="page-subtitle">Métricas del sistema FisioPlus en tiempo real</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Clínicas Registradas', value: data?.clinicasCount ?? 0, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pacientes (Global)', value: data?.totalPacientesGlobal ?? 0, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Fisioterapeutas', value: data?.totalFisioterapeutasGlobal ?? 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Citas Hoy (Global)', value: data?.citasHoyGlobal ?? 0, icon: LayoutDashboard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(stat => (
          <div key={stat.label} className="card p-5 flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-medical-500" /> Listado de Clínicas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="text-left py-3 px-2">Clínica</th>
              <th className="text-left py-3 px-2">Email Admin</th>
              <th className="text-left py-3 px-2">Ciudad</th>
              <th className="text-left py-3 px-2">Tipo</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.clinicas || []).map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-2 font-semibold text-slate-700">{c.nombreClinica}</td>
                  <td className="py-3 px-2 text-slate-500 font-mono text-xs">{c.email}</td>
                  <td className="py-3 px-2 text-slate-500">{c.ciudad || '—'}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.tipoRegistro === 'CONTRATADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {c.tipoRegistro}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Clinicas CRUD View ----
function ClinicasView() {
  const [clinicas, setClinicas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState({ nombreClinica: '', email: '', tipoRegistro: 'PRUEBA', direccion: '', telefono: '', ciudad: '', estado: '', pais: 'México', pacientesPorHora: 2 });

  const load = () => {
    setLoading(true);
    api.get('/clinicas').then(r => { setClinicas(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/clinicas', form);
      setShowForm(false);
      setForm({ nombreClinica: '', email: '', tipoRegistro: 'PRUEBA', direccion: '', telefono: '', ciudad: '', estado: '', pais: 'México', pacientesPorHora: 2 });
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al crear la clínica');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta clínica y sus cuentas asociadas?')) return;
    await api.delete(`/clinicas/${id}`);
    load();
  };

  const handleToggleEstatus = async (clinica) => {
    const nuevoEstatus = clinica.estatus === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const accion = nuevoEstatus === 'INACTIVO' ? 'desactivar' : 'activar';
    if (!confirm(`¿Deseas ${accion} la clínica "${clinica.nombreClinica}"?`)) return;
    try {
      await api.put(`/clinicas/${clinica.id}`, { ...clinica, estatus: nuevoEstatus });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cambiar estatus');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clínicas (Tenants)</h1>
          <p className="page-subtitle">Gestión de todas las clínicas clientes en el sistema</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary">
            <PlusCircle className="w-4 h-4" /> Nueva Clínica
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card p-6 animate-fadeIn border-medical-100 border">
          <h3 className="font-bold text-slate-800 mb-4 text-lg">Registrar Nueva Clínica</h3>
          {formError && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-xl border border-rose-100">{formError}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: 'nombreClinica', label: 'Nombre de la Clínica', placeholder: 'FisioPlus Centro', required: true },
              { name: 'email', label: 'Email del Admin', placeholder: 'admin@clinica.com', type: 'email', required: true },
              { name: 'direccion', label: 'Dirección', placeholder: 'Av. Salud 123', required: true },
              { name: 'telefono', label: 'Teléfono', placeholder: '555-0199' },
              { name: 'ciudad', label: 'Ciudad', placeholder: 'Ciudad de México' },
              { name: 'estado', label: 'Estado', placeholder: 'CDMX' },
              { name: 'pais', label: 'País', placeholder: 'México' },
              { name: 'pacientesPorHora', label: 'Pacientes por hora', type: 'number', min: 1, required: true },
            ].map(f => (
              <div key={f.name}>
                <label className="form-label">{f.label}{f.required && <span className="text-rose-500 ml-0.5">*</span>}</label>
                <input type={f.type || 'text'} value={form[f.name]} onChange={e => setForm(p => ({...p, [f.name]: e.target.value}))}
                  placeholder={f.placeholder} required={f.required} min={f.min} className="form-input" />
              </div>
            ))}
            <div>
              <label className="form-label">Tipo de Registro <span className="text-rose-500">*</span></label>
              <select value={form.tipoRegistro} onChange={e => setForm(p => ({...p, tipoRegistro: e.target.value}))} className="form-select">
                <option value="PRUEBA">PRUEBA</option>
                <option value="CONTRATADO">CONTRATADO</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                Crear Clínica
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-medical-500" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="text-left py-3 px-4">Clínica</th>
                <th className="text-left py-3 px-4">Email Admin</th>
                <th className="text-left py-3 px-4">Ciudad</th>
                <th className="text-left py-3 px-4">Pacientes/Hora</th>
                <th className="text-left py-3 px-4">Tipo</th>
                <th className="text-left py-3 px-4">Estatus</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {clinicas.map(c => (
                  <tr key={c.id} className={`hover:bg-slate-50/50 transition ${c.estatus === 'INACTIVO' ? 'opacity-60' : ''}`}>
                    <td className="py-3 px-4 font-semibold text-slate-800">{c.nombreClinica}</td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">{c.email}</td>
                    <td className="py-3 px-4 text-slate-500">{c.ciudad || '—'}</td>
                    <td className="py-3 px-4 text-slate-500 text-center">{c.pacientesPorHora}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.tipoRegistro === 'CONTRATADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {c.tipoRegistro}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.estatus || 'ACTIVO'} />
                    </td>
                    <td className="py-3 px-4 text-center flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleToggleEstatus(c)}
                        title={c.estatus === 'ACTIVO' ? 'Desactivar clínica' : 'Activar clínica'}
                        className={`p-1.5 rounded-lg transition ${c.estatus === 'ACTIVO' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                      >
                        {c.estatus === 'ACTIVO'
                          ? <ToggleRight className="w-5 h-5" />
                          : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition">
                        <Trash2 className="w-4 h-4" />
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

export default function SuperAdminPortal() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar navItems={NAV_ITEMS} portalLabel="Super Admin" />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <Routes>
          <Route path="dashboard" element={<DashboardView />} />
          <Route path="clinicas" element={<ClinicasView />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
