import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import {
  LayoutDashboard, Building2, Users, PlusCircle, Pencil, Trash2, Loader2, RefreshCw,
  ToggleLeft, ToggleRight, CreditCard, Search, Filter, ShieldCheck, Sparkles, X, CheckCircle2,
  Calendar, Zap, Check
} from 'lucide-react';
import api from '../services/api';

const NAV_ITEMS = [
  { path: '/superadmin/dashboard', label: 'Dashboard Global', icon: LayoutDashboard },
  { path: '/superadmin/clinicas', label: 'Clínicas (Tenants)', icon: Building2 },
  { path: '/superadmin/fisioterapeutas', label: 'Fisioterapeutas', icon: Users },
  { path: '/superadmin/pacientes', label: 'Pacientes', icon: Users },
  { path: '/superadmin/citas', label: 'Citas', icon: LayoutDashboard },
];

const PLANES_CATALOGO = [
  { id: 'PRUEBA', label: 'PRUEBA', badgeStyle: 'bg-amber-100 text-amber-800 border-amber-300', pacientesDefecto: 2, desc: 'Prueba Gratuita (15 días)' },
  { id: 'BASICO', label: 'BÁSICO', badgeStyle: 'bg-sky-100 text-sky-800 border-sky-300', pacientesDefecto: 2, desc: 'Plan Básico Inicial' },
  { id: 'CONTRATADO', label: 'CONTRATADO', badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-300', pacientesDefecto: 4, desc: 'Plan Estándar Activo' },
  { id: 'PRO', label: 'PRO', badgeStyle: 'bg-indigo-100 text-indigo-800 border-indigo-300', pacientesDefecto: 6, desc: 'Plan Profesional Avanzado' },
  { id: 'PREMIUM', label: 'PREMIUM', badgeStyle: 'bg-purple-100 text-purple-800 border-purple-300', pacientesDefecto: 10, desc: 'Plan Premium sin Límites' },
  { id: 'ENTERPRISE', label: 'ENTERPRISE', badgeStyle: 'bg-rose-100 text-rose-800 border-rose-300', pacientesDefecto: 20, desc: 'Plan Corporativo Personalizado' },
];

function PlanBadge({ tipo }) {
  const planUpper = (tipo || 'PRUEBA').toUpperCase();
  const match = PLANES_CATALOGO.find(p => p.id === planUpper || p.label === planUpper);
  const style = match ? match.badgeStyle : 'bg-teal-100 text-teal-800 border-teal-300';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border tracking-wide inline-flex items-center gap-1 ${style}`}>
      <Sparkles className="w-3 h-3 shrink-0" />
      {tipo || 'PRUEBA'}
    </span>
  );
}

// Modal de edición integral de clínica (Paquete, Datos Generales, Horarios)
function EditarClinicaCompletaModal({ clinica, initialTab = 'suscripcion', onClose, onSave }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form general & subscription data
  const [form, setForm] = useState({
    nombreClinica: clinica.nombreClinica || '',
    email: clinica.email || '',
    direccion: clinica.direccion || '',
    telefono: clinica.telefono || '',
    ciudad: clinica.ciudad || '',
    estado: clinica.estado || '',
    pais: clinica.pais || 'México',
    pacientesPorHora: clinica.pacientesPorHora || 2,
    tipoRegistro: clinica.tipoRegistro || 'PRUEBA',
    estatus: clinica.estatus || 'ACTIVO',
    vigencia: clinica.vigencia || ''
  });

  const [tipoPersonalizado, setTipoPersonalizado] = useState(clinica.tipoRegistro || '');
  const [isCustom, setIsCustom] = useState(!PLANES_CATALOGO.some(p => p.id === (clinica.tipoRegistro || '').toUpperCase() || p.label === (clinica.tipoRegistro || '').toUpperCase()));

  // Operating Hours Data
  const [horarios, setHorarios] = useState([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);

  useEffect(() => {
    setLoadingHorarios(true);
    api.get(`/clinicas/${clinica.id}/horarios`)
      .then(r => {
        const order = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        let list = (r.data || []);
        if (list.length === 0) {
          list = order.map(d => ({ diaSemana: d, apertura: '08:00', cierre: '20:00', cerrado: d === 'Domingo' }));
        } else {
          list.sort((a, b) => order.indexOf(a.diaSemana) - order.indexOf(b.diaSemana));
        }
        setHorarios(list);
      })
      .catch(() => {
        const order = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        setHorarios(order.map(d => ({ diaSemana: d, apertura: '08:00', cierre: '20:00', cerrado: d === 'Domingo' })));
      })
      .finally(() => setLoadingHorarios(false));
  }, [clinica.id]);

  const handleHorarioChange = (index, field, value) => {
    setHorarios(list => list.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const planFinal = isCustom ? (tipoPersonalizado.trim().toUpperCase() || 'PERSONALIZADO') : form.tipoRegistro;

    try {
      // 1. Update clinic general & subscription info
      await api.put(`/clinicas/${clinica.id}`, {
        ...clinica,
        ...form,
        tipoRegistro: planFinal,
        pacientesPorHora: parseInt(form.pacientesPorHora, 10)
      });

      // 2. Update clinic operating hours
      if (horarios.length > 0) {
        const payload = horarios.map(h => ({
          diaSemana: h.diaSemana,
          apertura: (h.apertura || '08:00').substring(0, 5),
          cierre: (h.cierre || '20:00').substring(0, 5),
          cerrado: !!h.cerrado
        }));
        await api.put(`/clinicas/${clinica.id}/horarios`, payload);
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar los datos de la clínica');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="card max-w-2xl w-full p-6 space-y-5 bg-white shadow-2xl rounded-2xl border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-medical-600" /> Edición Integral de Clínica (SuperAdmin)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Clínica: <span className="font-semibold text-slate-700">{clinica.nombreClinica}</span> (ID: #{clinica.id})</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('suscripcion')}
            className={`py-2 px-4 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'suscripcion'
                ? 'border-medical-600 text-medical-600 bg-medical-50/50'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Paquete & Suscripción
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-2 px-4 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'border-medical-600 text-medical-600 bg-medical-50/50'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Building2 className="w-4 h-4" /> Datos Generales
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('horarios')}
            className={`py-2 px-4 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'horarios'
                ? 'border-medical-600 text-medical-600 bg-medical-50/50'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar className="w-4 h-4" /> Horario Operativo
          </button>
        </div>

        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl shrink-0">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* TAB 1: Suscripción & Paquete */}
          {activeTab === 'suscripcion' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="form-label font-bold text-slate-700">Tipo de Paquete / Suscripción</label>
                <select
                  value={isCustom ? 'CUSTOM' : form.tipoRegistro}
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM') {
                      setIsCustom(true);
                    } else {
                      setIsCustom(false);
                      const val = e.target.value;
                      const p = PLANES_CATALOGO.find(item => item.id === val);
                      setForm(prev => ({
                        ...prev,
                        tipoRegistro: val,
                        pacientesPorHora: p ? p.pacientesDefecto : prev.pacientesPorHora
                      }));
                    }
                  }}
                  className="form-select"
                >
                  {PLANES_CATALOGO.map(p => (
                    <option key={p.id} value={p.id}>{p.label} — {p.desc}</option>
                  ))}
                  <option value="CUSTOM">✨ Paquete Personalizado...</option>
                </select>
              </div>

              {isCustom && (
                <div>
                  <label className="form-label font-bold text-slate-700">Nombre del Paquete Personalizado</label>
                  <input
                    type="text"
                    value={tipoPersonalizado}
                    onChange={e => setTipoPersonalizado(e.target.value)}
                    placeholder="Ej. VIP, CONVENIO, PLATINUM"
                    required
                    className="form-input"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label font-bold text-slate-700">Pacientes por hora (Capacidad)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={form.pacientesPorHora}
                    onChange={e => setForm(p => ({ ...p, pacientesPorHora: e.target.value }))}
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label font-bold text-slate-700">Estatus Operativo</label>
                  <select
                    value={form.estatus}
                    onChange={e => setForm(p => ({ ...p, estatus: e.target.value }))}
                    className="form-select"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO / SUSPENDIDO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label text-slate-700">Fecha de Renovación / Vigencia (Opcional)</label>
                <input
                  type="date"
                  value={form.vigencia}
                  onChange={e => setForm(p => ({ ...p, vigencia: e.target.value }))}
                  className="form-input"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Datos Generales */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="form-label font-bold text-slate-700">Nombre de la Clínica</label>
                <input
                  type="text"
                  value={form.nombreClinica}
                  onChange={e => setForm(p => ({ ...p, nombreClinica: e.target.value }))}
                  required
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label font-bold text-slate-700">Email Administrador</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label font-bold text-slate-700">Teléfono</label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label font-bold text-slate-700">Dirección</label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))}
                  required
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label text-slate-700">Ciudad</label>
                  <input
                    type="text"
                    value={form.ciudad}
                    onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label text-slate-700">Estado</label>
                  <input
                    type="text"
                    value={form.estado}
                    onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label text-slate-700">País</label>
                  <input
                    type="text"
                    value={form.pais}
                    onChange={e => setForm(p => ({ ...p, pais: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Horario Operativo */}
          {activeTab === 'horarios' && (
            <div className="space-y-3 animate-fadeIn">
              <p className="text-xs text-slate-500 font-semibold mb-2">
                Configuración del horario semanal de atención de la clínica:
              </p>
              {loadingHorarios ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-medical-500" /></div>
              ) : (
                <div className="space-y-2">
                  {horarios.map((h, i) => (
                    <div key={h.diaSemana} className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <span className="font-bold text-slate-700 w-24">{h.diaSemana}</span>
                      
                      {!h.cerrado ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            value={(h.apertura || '08:00').substring(0, 5)}
                            onChange={e => handleHorarioChange(i, 'apertura', e.target.value)}
                            className="border border-slate-200 rounded px-2 py-1 text-xs bg-white"
                          />
                          <span className="text-slate-400">a</span>
                          <input
                            type="time"
                            value={(h.cierre || '20:00').substring(0, 5)}
                            onChange={e => handleHorarioChange(i, 'cierre', e.target.value)}
                            className="border border-slate-200 rounded px-2 py-1 text-xs bg-white"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full uppercase">Cerrado</span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleHorarioChange(i, 'cerrado', !h.cerrado)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                          h.cerrado ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        {h.cerrado ? 'Cerrado' : 'Abierto'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary text-xs py-2 px-4">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Fisioterapeutas CRUD View ----
function FisioterapeutasView() {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fisioterapeutas</h1>
          <p className="page-subtitle">Gestión de todos los fisioterapeutas en el sistema</p>
        </div>
      </div>

      <div className="card p-6">
        <p className="text-slate-500">Esta sección está en construcción.</p>
      </div>
    </div>
  );
}

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
                    <PlanBadge tipo={c.tipoRegistro} />
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
  const [selectedClinicaEdit, setSelectedClinicaEdit] = useState(null);
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('TODOS');
  const [estatusFilter, setEstatusFilter] = useState('TODOS');

  const [form, setForm] = useState({
    nombreClinica: '',
    email: '',
    tipoRegistro: 'PRUEBA',
    tipoRegistroCustom: '',
    direccion: '',
    telefono: '',
    ciudad: '',
    estado: '',
    pais: 'México',
    pacientesPorHora: 2
  });

  const load = () => {
    setLoading(true);
    api.get('/clinicas').then(r => { setClinicas(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const tipoFinal = form.tipoRegistro === 'CUSTOM'
      ? (form.tipoRegistroCustom.trim().toUpperCase() || 'PERSONALIZADO')
      : form.tipoRegistro;

    try {
      await api.post('/clinicas', { ...form, tipoRegistro: tipoFinal });
      setShowForm(false);
      setForm({
        nombreClinica: '', email: '', tipoRegistro: 'PRUEBA', tipoRegistroCustom: '',
        direccion: '', telefono: '', ciudad: '', estado: '', pais: 'México', pacientesPorHora: 2
      });
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

  // Filtered List
  const filteredClinicas = clinicas.filter(c => {
    const matchesSearch =
      (c.nombreClinica || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.ciudad || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTipo = tipoFilter === 'TODOS' || (c.tipoRegistro || '').toUpperCase() === tipoFilter;
    const matchesEstatus = estatusFilter === 'TODOS' || (c.estatus || 'ACTIVO') === estatusFilter;

    return matchesSearch && matchesTipo && matchesEstatus;
  });

  // Unique subscription types from existing list for filter dropdown
  const availablePlanTypes = Array.from(new Set(clinicas.map(c => (c.tipoRegistro || 'PRUEBA').toUpperCase())));

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clínicas (Tenants)</h1>
          <p className="page-subtitle">Gestión integral de clientes y sus paquetes de suscripción</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary" title="Actualizar lista"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary">
            <PlusCircle className="w-4 h-4" /> Nueva Clínica
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Building2 className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Total Registradas</p>
            <p className="text-xl font-bold text-slate-800">{clinicas.length}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Zap className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">En Período de Prueba</p>
            <p className="text-xl font-bold text-amber-600">{clinicas.filter(c => (c.tipoRegistro || '').toUpperCase() === 'PRUEBA').length}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><ShieldCheck className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Planes Pagados / Activos</p>
            <p className="text-xl font-bold text-emerald-600">{clinicas.filter(c => (c.tipoRegistro || '').toUpperCase() !== 'PRUEBA' && c.estatus !== 'INACTIVO').length}</p>
          </div>
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
              <label className="form-label">Tipo de Suscripción / Paquete <span className="text-rose-500">*</span></label>
              <select
                value={form.tipoRegistro}
                onChange={e => {
                  const val = e.target.value;
                  setForm(p => {
                    const match = PLANES_CATALOGO.find(item => item.id === val);
                    return {
                      ...p,
                      tipoRegistro: val,
                      pacientesPorHora: match ? match.pacientesDefecto : p.pacientesPorHora
                    };
                  });
                }}
                className="form-select"
              >
                {PLANES_CATALOGO.map(p => (
                  <option key={p.id} value={p.id}>{p.label} — {p.desc}</option>
                ))}
                <option value="CUSTOM">✨ Personalizado...</option>
              </select>
            </div>

            {form.tipoRegistro === 'CUSTOM' && (
              <div>
                <label className="form-label">Nombre del Paquete Personalizado <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.tipoRegistroCustom}
                  onChange={e => setForm(p => ({...p, tipoRegistroCustom: e.target.value}))}
                  placeholder="Ej. VIP, CONVENIO_CORPORATIVO"
                  required
                  className="form-input"
                />
              </div>
            )}

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

      {/* Filters Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 justify-between items-center bg-white shadow-sm border border-slate-100">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por clínica, email o ciudad..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold shrink-0">
            <Filter className="w-3.5 h-3.5 text-medical-600" /> Paquete:
          </div>
          <select
            value={tipoFilter}
            onChange={e => setTipoFilter(e.target.value)}
            className="form-select text-xs py-1.5 px-3 w-full md:w-auto"
          >
            <option value="TODOS">Todos los Paquetes</option>
            {PLANES_CATALOGO.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
            {availablePlanTypes
              .filter(tp => !PLANES_CATALOGO.some(p => p.id === tp))
              .map(tp => (
                <option key={tp} value={tp}>{tp} (Personalizado)</option>
              ))}
          </select>

          <select
            value={estatusFilter}
            onChange={e => setEstatusFilter(e.target.value)}
            className="form-select text-xs py-1.5 px-3 w-full md:w-auto"
          >
            <option value="TODOS">Todos los Estatus</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-medical-500" /></div>
          ) : filteredClinicas.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No se encontraron clínicas</p>
              <p className="text-xs text-slate-400 mt-1">Prueba cambiando los criterios de búsqueda o filtros.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="text-left py-3 px-4">Clínica</th>
                <th className="text-left py-3 px-4">Email Admin</th>
                <th className="text-left py-3 px-4">Ciudad</th>
                <th className="text-center py-3 px-4">Pacientes/Hora</th>
                <th className="text-left py-3 px-4">Tipo / Suscripción</th>
                <th className="text-left py-3 px-4">Estatus</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filteredClinicas.map(c => (
                  <tr key={c.id} className={`hover:bg-slate-50/50 transition ${c.estatus === 'INACTIVO' ? 'opacity-60' : ''}`}>
                    <td className="py-3 px-4 font-semibold text-slate-800">{c.nombreClinica}</td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">{c.email}</td>
                    <td className="py-3 px-4 text-slate-500">{c.ciudad || '—'}</td>
                    <td className="py-3 px-4 text-slate-600 text-center font-bold">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs">{c.pacientesPorHora}</span>
                    </td>
                    <td className="py-3 px-4">
                      <PlanBadge tipo={c.tipoRegistro} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.estatus || 'ACTIVO'} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedClinicaEdit({ clinica: c, tab: 'suscripcion' })}
                          title="Gestionar paquete y suscripción"
                          className="p-1.5 rounded-lg text-medical-600 hover:bg-medical-50 transition border border-transparent hover:border-medical-200"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedClinicaEdit({ clinica: c, tab: 'general' })}
                          title="Editar datos generales"
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition border border-transparent hover:border-indigo-200"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedClinicaEdit({ clinica: c, tab: 'horarios' })}
                          title="Configurar horarios operativos"
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition border border-transparent hover:border-amber-200"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Edición Integral de Clínica */}
      {selectedClinicaEdit && (
        <EditarClinicaCompletaModal
          clinica={selectedClinicaEdit.clinica}
          initialTab={selectedClinicaEdit.tab || 'suscripcion'}
          onClose={() => setSelectedClinicaEdit(null)}
          onSave={load}
        />
      )}
    </div>
  );
}


function PacientesView() {
  
  const [pacientes,setPacientes] = useState([]);
  const [loading,setLoading] = useState(true);
  const [clinicas, setClinicas] = useState([]); 
  const [selectedClinica, setSelectedClinica] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nombre:'', apellidoPaterno:'', apellidoMaterno:'', email:'', telefono:'', fechaNacimiento:'', sexo:'MASCULINO' });
  const [showForm, setShowForm] = useState(false);

  const load = () => { 
    setLoading(true);

  // Primera petición
  api.get('/pacientes')
    .then(r => setPacientes(r.data))
    .catch(err => console.error(err));

  // Segunda petición
  api.get('/clinicas')
    .then(r => setClinicas(r.data))
    .catch(err => console.error(err))
    .finally(() => setLoading(false)); // Quita el loader general al terminar
  };

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

  const handlechangeClinica = (e) => {
    setSelectedClinica(e.target.value);
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pacientes</h1>
          <p className="page-subtitle">Gestión de todos los pacientes en el sistema</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary">
            <PlusCircle className="w-4 h-4" /> Nuevo Paciente
          </button>
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

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-medical-500" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="text-left py-3 px-4">Paciente</th>
                <th className="text-left py-3 px-4">Apellidos</th>
                <th className="text-left py-3 px-4">Telefono</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Ciudad</th>
                <th className="text-left py-3 px-4">Medico Tratante</th>
                <th className="py-3 px-4 text-center">Estatus</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {pacientes.map(c => (
                  <tr key={c.id} className={`hover:bg-slate-50/50 transition ${c.Estatus === 'INACTIVO' ? 'opacity-60' : ''}`}>
                    <td className="py-3 px-4 font-semibold text-slate-800">{c.nombre}</td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">{`${c.apellidoPaterno || ''} ${c.apellidoMaterno || ''}`.trim()}</td>
                    <td className="py-3 px-4 text-slate-500">{c.telefono || '—'}</td>
                    <td className="py-3 px-4 text-slate-500 text-center">{c.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.tipoRegistro === 'CONTRATADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {c.ciudad || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.medicoTratante || 'SIN MEDICO'} />
                    </td>
                    <td className="py-3 px-4 text-center flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleToggleEstatus(c)}
                        title={c.estatus === 'ACTIVO' ? 'Desactivar clínica' : 'Activar clínica'}
                        className={`p-1.5 rounded-lg transition ${c.estatus === 'ACTIVO' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                      >
                        {c.Estatus === 'ACTIVO'
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
  )

}

function CitasView() {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Citas</h1>
          <p className="page-subtitle">Gestión de todas las citas en el sistema</p>
        </div>
      </div>

      <div className="card p-6">
        <p className="text-slate-500">Esta sección está en construcción.</p>
      </div>
    </div>
  )
}

export default function SuperAdminPortal() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar navItems={NAV_ITEMS} portalLabel="Super Admin" />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <Routes>
          <Route path="dashboard" element={<DashboardView />} />
          <Route path="clinicas" element={<ClinicasView />} />
          <Route path="fisioterapeutas" element={<FisioterapeutasView />} />
          <Route path="pacientes" element={<PacientesView />} />
          <Route path="citas" element={<CitasView />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
