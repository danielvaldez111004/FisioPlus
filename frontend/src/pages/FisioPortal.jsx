import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { citaService } from '../services/citaService';
import Calendar from '../components/Calendar';
import { 
  CalendarDays, 
  CheckCircle, 
  Clock, 
  Trash2, 
  User, 
  Plus, 
  Info, 
  Clipboard, 
  Activity, 
  UserCheck,
  UserX,
  X,
  FileText
} from 'lucide-react';
import api from '../services/api';

// ═══════════════════════════════════════
// INITIAL MOCK BACKUP
// ═══════════════════════════════════════
const INITIAL_MOCK_CITAS = [
  {
    id: 101,
    paciente: 'María González',
    pacienteId: 1,
    descripcion: 'Rehabilitación lumbar - Sesión 3',
    servicio: 'Fisioterapia Lumbar',
    servicioContratadoId: 1,
    numeroSesion: 3,
    estatus: 'PROGRAMADA',
    fechaInicio: '2026-05-23T09:00:00',
    fechaFin: '2026-05-23T10:00:00',
  },
  {
    id: 102,
    paciente: 'Carlos Mendoza',
    pacienteId: 2,
    descripcion: 'Rehabilitación de hombro',
    servicio: 'Fisioterapia Hombro',
    servicioContratadoId: 2,
    numeroSesion: 1,
    estatus: 'EN_PROCESO',
    fechaInicio: '2026-05-23T10:00:00',
    fechaFin: '2026-05-23T11:00:00',
  },
  {
    id: 103,
    paciente: 'Ana Ramos',
    pacienteId: 3,
    descripcion: 'Terapia cervical profunda',
    servicio: 'Terapia Cervical',
    servicioContratadoId: 3,
    numeroSesion: 7,
    estatus: 'TERMINADA',
    fechaInicio: '2026-05-23T11:00:00',
    fechaFin: '2026-05-23T12:00:00',
    tratamientoAplicado: 'Electroterapia, TENS y movilizaciones asistidas',
    observaciones: 'El rango de movimiento mejoró 15 grados en rotación.',
    indicacionesPostCita: 'Colocar compresa fría por 15 min. Ejercicios isométricos.'
  },
];

const MOCK_PACIENTES = [
  { id: 1, nombre: 'María', apellidoPaterno: 'González', email: 'maria.gonzalez@email.com', telefono: '667-123-4567' },
  { id: 2, nombre: 'Carlos', apellidoPaterno: 'Mendoza', email: 'carlos.mendoza@email.com', telefono: '667-987-6543' },
  { id: 3, nombre: 'Ana', apellidoPaterno: 'Ramos', email: 'ana.ramos@email.com', telefono: '667-456-7890' },
  { id: 4, nombre: 'Pedro', apellidoPaterno: 'Soto', email: 'pedro.soto@email.com', telefono: '667-321-7654' },
];

const MOCK_CONTRATOS = {
  1: [{ id: 1, servicioId: 1, descripcion: 'Rehabilitación lumbar (10 sesiones)', cantidadSesiones: 10 }],
  2: [{ id: 2, servicioId: 2, descripcion: 'Rehabilitación de hombro (5 sesiones)', cantidadSesiones: 5 }],
  3: [{ id: 3, servicioId: 3, descripcion: 'Terapia cervical (8 sesiones)', cantidadSesiones: 8 }],
  4: [{ id: 4, servicioId: 4, descripcion: 'Rodilla general (10 sesiones)', cantidadSesiones: 10 }]
};

export default function FisioPortal() {
  const { logout, user } = useAuth();
  const [vista, setVista] = useState('dashboard');
  const [citas, setCitas] = useState(INITIAL_MOCK_CITAS);
  const [pacientes, setPacientes] = useState(MOCK_PACIENTES);
  const [contratos, setContratos] = useState([]);
  
  // Get local date today formatted as YYYY-MM-DD
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  
  // App states
  const [loading, setLoading] = useState(false);
  const [selectedCita, setSelectedCita] = useState(null);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  
  // Scheduling state form
  const [formPacienteId, setFormPacienteId] = useState('');
  const [formContratoId, setFormContratoId] = useState('');
  const [formFecha, setFormFecha] = useState('');
  const [formHoraInicio, setFormHoraInicio] = useState('08:00');
  const [formHoraFin, setFormHoraFin] = useState('09:00');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formIndicaciones, setFormIndicaciones] = useState('');

  // Close session state form
  const [closeTratamiento, setCloseTratamiento] = useState('');
  const [closeObservaciones, setCloseObservaciones] = useState('');
  const [closeIndicaciones, setCloseIndicaciones] = useState('');

  // Load appointments from backend
  const loadCitas = async () => {
    setLoading(true);
    try {
      const data = await citaService.getCitas();
      if (Array.isArray(data)) {
        // Map backend entities to our UI properties
        const mapped = data.map(c => ({
          id: c.id,
          paciente: c.paciente || (c.servicioContratado?.paciente 
            ? `${c.servicioContratado.paciente.nombre} ${c.servicioContratado.paciente.apellidoPaterno}`
            : 'Paciente'),
          pacienteId: c.servicioContratado?.pacienteId,
          descripcion: c.descripcion || 'Sin descripción',
          servicio: c.servicioContratado?.servicio?.descripcion || 'Tratamiento',
          servicioContratadoId: c.servicioContratadoId,
          numeroSesion: c.numeroSesion,
          estatus: c.estatus,
          fechaInicio: c.fechaInicio,
          fechaFin: c.fechaFin,
          indicacionesPrevioCita: c.indicacionesPrevioCita,
          indicacionesPostCita: c.indicacionesPostCita,
          tratamientoAplicado: c.tratamientoAplicado,
          observaciones: c.observaciones
        }));
        setCitas(mapped);
      }
    } catch (err) {
      console.warn("REST API offline: usando base de datos local en memoria para citas.", err);
    } finally {
      setLoading(false);
    }
  };

  // Load patients from backend
  const loadPacientes = async () => {
    try {
      const response = await api.get('/pacientes');
      if (Array.isArray(response.data)) {
        setPacientes(response.data);
      }
    } catch (err) {
      console.warn("REST API offline: usando lista de pacientes simulados.", err);
    }
  };

  useEffect(() => {
    loadCitas();
    loadPacientes();
  }, []);

  // When patient is selected in creation form, get their active contracts
  useEffect(() => {
    if (!formPacienteId) {
      setContratos([]);
      return;
    }
    const loadContracts = async () => {
      try {
        const data = await citaService.getServiciosContratados(formPacienteId);
        if (Array.isArray(data) && data.length > 0) {
          setContratos(data);
          setFormContratoId(data[0].id);
        } else {
          // Mock fallback
          const mockList = MOCK_CONTRATOS[formPacienteId] || [];
          setContratos(mockList);
          if (mockList.length > 0) setFormContratoId(mockList[0].id);
        }
      } catch (e) {
        const mockList = MOCK_CONTRATOS[formPacienteId] || [];
        setContratos(mockList);
        if (mockList.length > 0) setFormContratoId(mockList[0].id);
      }
    };
    loadContracts();
  }, [formPacienteId]);

  // Handle scheduling
  const handleScheduleAppointment = async (e) => {
    e.preventDefault();
    if (!formPacienteId || !formContratoId || !formFecha) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const startDateTime = `${formFecha}T${formHoraInicio}:00`;
    const endDateTime = `${formFecha}T${formHoraFin}:00`;

    const selectedPatient = pacientes.find(p => String(p.id) === String(formPacienteId));
    const selectedContract = contratos.find(c => String(c.id) === String(formContratoId));

    const newCitaPayload = {
      servicioContratadoId: Number(formContratoId),
      fisioterapeutaId: user?.userId || 2,
      fechaInicio: startDateTime,
      fechaFin: endDateTime,
      descripcion: formDescripcion,
      indicacionesPrevioCita: formIndicaciones,
    };

    setLoading(true);
    try {
      const response = await citaService.createCita(newCitaPayload);
      // Success! Refresh list from backend
      await loadCitas();
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      console.warn("Backend offline: agendando en estado local.", err);
      // Fallback local scheduling
      const localCita = {
        id: Date.now(),
        paciente: selectedPatient ? `${selectedPatient.nombre} ${selectedPatient.apellidoPaterno || ''}` : 'Paciente',
        pacienteId: Number(formPacienteId),
        descripcion: formDescripcion || 'Consulta general',
        servicio: selectedContract ? selectedContract.descripcion : 'Fisioterapia',
        servicioContratadoId: Number(formContratoId),
        numeroSesion: (citas.filter(c => c.servicioContratadoId === Number(formContratoId)).length) + 1,
        estatus: 'PROGRAMADA',
        fechaInicio: startDateTime,
        fechaFin: endDateTime,
        indicacionesPrevioCita: formIndicaciones
      };
      setCitas(prev => [...prev, localCita]);
      setShowCreateModal(false);
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  // Perform Check-in
  const handleCheckIn = async (id) => {
    try {
      await citaService.checkIn(id);
      await loadCitas();
      if (selectedCita && selectedCita.id === id) {
        setSelectedCita(prev => ({ ...prev, estatus: 'EN_PROCESO' }));
      }
    } catch (e) {
      console.warn("Backend offline: aplicando check-in local.");
      setCitas(prev => prev.map(c => c.id === id ? { ...c, estatus: 'EN_PROCESO' } : c));
      setSelectedCita(prev => ({ ...prev, estatus: 'EN_PROCESO' }));
    }
  };

  // Perform Check-out
  const handleCheckOut = async (id) => {
    try {
      await citaService.checkOut(id);
      await loadCitas();
    } catch (e) {
      console.warn("Backend offline: aplicando check-out local.");
    }
  };

  // Open modal to close appointment (record treatments)
  const openCloseAppointment = (cita) => {
    setSelectedCita(cita);
    setCloseTratamiento('');
    setCloseObservaciones('');
    setCloseIndicaciones('');
    setShowCloseModal(true);
  };

  // Submit closure
  const handleCloseAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!closeTratamiento.trim()) {
      alert('El tratamiento aplicado es obligatorio');
      return;
    }

    const payload = {
      tratamientoAplicado: closeTratamiento,
      observaciones: closeObservaciones,
      indicacionesPostCita: closeIndicaciones,
    };

    try {
      await citaService.cerrarCita(selectedCita.id, payload);
      await loadCitas();
      setShowCloseModal(false);
      setVista('agenda');
    } catch (err) {
      console.warn("Backend offline: cerrando cita en local.");
      setCitas(prev => prev.map(c => c.id === selectedCita.id ? { 
        ...c, 
        estatus: 'TERMINADA',
        tratamientoAplicado: closeTratamiento,
        observaciones: closeObservaciones,
        indicacionesPostCita: closeIndicaciones
      } : c));
      setShowCloseModal(false);
      setVista('agenda');
    }
  };

  // Soft-cancel (delete)
  const handleCancelAppointment = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta cita?')) return;
    try {
      await citaService.deleteCita(id);
      await loadCitas();
      setVista('agenda');
    } catch (e) {
      console.warn("Backend offline: cancelando cita en local.");
      setCitas(prev => prev.map(c => c.id === id ? { ...c, estatus: 'CANCELADA' } : c));
      setVista('agenda');
    }
  };

  const resetForm = () => {
    setFormPacienteId('');
    setFormContratoId('');
    setFormFecha('');
    setFormHoraInicio('08:00');
    setFormHoraFin('09:00');
    setFormDescripcion('');
    setFormIndicaciones('');
  };

  // Render Status Badge helper
  const getBadgeClass = (status) => {
    switch (status) {
      case 'PROGRAMADA': return 'badge-programada';
      case 'EN_PROCESO': return 'badge-en-proceso';
      case 'TERMINADA': return 'badge-terminada';
      case 'CANCELADA': return 'badge-cancelada';
      default: return 'badge-programada';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* HEADER NAVBAR */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">
            Fisio<span className="text-emerald-600">Plus</span>
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full ml-2">Fisioterapeuta</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">{user?.alias || user?.username}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.rol?.toLowerCase()}</p>
          </div>
          <button 
            onClick={logout} 
            className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl shadow-sm text-slate-600 hover:bg-slate-50 transition active:scale-95"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* PORTAL INTERFACE CONTENT */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* NAV TABS */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setVista('dashboard'); setSelectedCita(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 ${
                vista === 'dashboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => { setVista('agenda'); setSelectedCita(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 ${
                vista === 'agenda' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Agenda Interactiva
            </button>
            <button
              onClick={() => { setVista('perfil'); setSelectedCita(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 ${
                vista === 'perfil' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Perfil
            </button>
          </div>

          {vista === 'agenda' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
              style={{ backgroundColor: '#0f6e56' }}
            >
              <Plus className="w-4 h-4" />
              <span>Programar Cita</span>
            </button>
          )}
        </div>

        {/* ─── VISTA: DASHBOARD ─── */}
        {vista === 'dashboard' && (
          <div className="grid lg:grid-cols-3 gap-6 animate-fadeIn">
            {/* Resumen metricas */}
            <div className="lg:col-span-3 grid sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                <span className="text-xs font-semibold text-slate-400 block mb-1">Citas Hoy</span>
                <span className="text-2xl font-bold text-slate-800">
                  {citas.filter(c => c.estatus === 'PROGRAMADA' && c.fechaInicio?.startsWith(todayStr)).length}
                </span>
              </div>
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                <span className="text-xs font-semibold text-slate-400 block mb-1">En Curso</span>
                <span className="text-2xl font-bold text-amber-600">
                  {citas.filter(c => c.estatus === 'EN_PROCESO' && c.fechaInicio?.startsWith(todayStr)).length}
                </span>
              </div>
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                <span className="text-xs font-semibold text-slate-400 block mb-1">Completadas</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {citas.filter(c => c.estatus === 'TERMINADA' && c.fechaInicio?.startsWith(todayStr)).length}
                </span>
              </div>
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                <span className="text-xs font-semibold text-slate-400 block mb-1">Canceladas</span>
                <span className="text-2xl font-bold text-rose-600">
                  {citas.filter(c => c.estatus === 'CANCELADA' && c.fechaInicio?.startsWith(todayStr)).length}
                </span>
              </div>
            </div>

            {/* List of today's appointments */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="page-header mb-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Resumen del Día</h3>
                  <p className="text-xs text-slate-400">Pacientes agendados y en atención hoy</p>
                </div>
              </div>

              {citas.filter(c => c.fechaInicio?.startsWith(todayStr)).length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
                  No hay citas registradas para el día de hoy.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {citas.filter(c => c.fechaInicio?.startsWith(todayStr)).map((cita) => (
                    <div
                      key={cita.id}
                      onClick={() => {
                        setSelectedCita(cita);
                        setVista('detalleCitaFisio');
                      }}
                      className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition duration-150 cursor-pointer flex justify-between items-center group"
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                          {cita.paciente?.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition">
                            {cita.paciente}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">{cita.descripcion}</p>
                          <span className="text-[11px] text-slate-400 font-semibold inline-flex items-center gap-1 mt-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(cita.fechaInicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(cita.fechaFin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={getBadgeClass(cita.estatus)}>
                          {cita.estatus?.replace('_', ' ')}
                        </span>
                        <span className="text-slate-300 font-bold group-hover:translate-x-0.5 transition">›</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick tips card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4 self-start">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                <Info className="w-4 h-4 text-emerald-600" />
                <span>Panel Informativo</span>
              </h4>
              <div className="flex flex-col gap-3 text-xs text-slate-500 leading-relaxed">
                <p>
                  <strong>1. Agenda Interactiva:</strong> Ve a la pestaña de agenda para administrar turnos por arrastre y clics usando FullCalendar.
                </p>
                <p>
                  <strong>2. Flujo de Atención:</strong> Selecciona citas hoy y haz "Check-in" cuando llegue tu paciente para iniciar la terapia.
                </p>
                <p>
                  <strong>3. Cierre Clínico:</strong> Completa el formulario de observaciones al finalizar para guardar el expediente en la nube de Spring Boot.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── VISTA: AGENDA INTERACTIVA (FullCalendar) ─── */}
        {vista === 'agenda' && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <div className="page-header mb-1">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Calendario Operativo</h3>
                <p className="text-xs text-slate-400">Visualiza horarios de disponibilidad, organiza turnos y haz clics en eventos para actualizarlos</p>
              </div>
            </div>
            
            <Calendar
              events={citas}
              selectable={true}
              onDateSelect={(slotInfo) => {
                const datePart = slotInfo.startStr.split('T')[0];
                const startHour = slotInfo.startStr.split('T')[1]?.substring(0, 5) || '08:00';
                const endHour = slotInfo.endStr.split('T')[1]?.substring(0, 5) || '09:00';
                
                setFormFecha(datePart);
                setFormHoraInicio(startHour);
                setFormHoraFin(endHour);
                setShowCreateModal(true);
              }}
              onEventClick={(eventProps) => {
                setSelectedCita(eventProps);
                setVista('detalleCitaFisio');
              }}
            />
          </div>
        )}

        {/* ─── VISTA: DETALLE DE CITA ─── */}
        {vista === 'detalleCitaFisio' && selectedCita && (
          <div className="max-w-2xl w-full mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col gap-6 animate-fadeIn">
            <button
              onClick={() => {
                setSelectedCita(null);
                setVista('agenda');
              }}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1 self-start"
            >
              ← Regresar al calendario
            </button>

            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full mb-2 inline-block">
                  Cita #{selectedCita.id}
                </span>
                <h3 className="text-xl font-bold text-slate-800">{selectedCita.paciente}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedCita.servicio}</p>
              </div>
              <span className={getBadgeClass(selectedCita.estatus)}>
                {selectedCita.estatus?.replace('_', ' ')}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl flex gap-3 items-center">
                <Clock className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Inicio</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {new Date(selectedCita.fechaInicio).toLocaleString('es-MX')}
                  </span>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl flex gap-3 items-center">
                <Clock className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Término</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {new Date(selectedCita.fechaFin).toLocaleString('es-MX')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Detalle de la consulta</span>
              <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl leading-relaxed">
                {selectedCita.descripcion || 'Sin descripción adicional para esta sesión.'}
              </p>
            </div>

            {selectedCita.indicacionesPrevioCita && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Indicaciones Previas</span>
                <p className="text-xs text-slate-500 bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                  {selectedCita.indicacionesPrevioCita}
                </p>
              </div>
            )}

            {/* EXPEDIENTE CLINICO SI YA FUE CERRADA */}
            {selectedCita.estatus === 'TERMINADA' && (
              <div className="border-t border-slate-100 pt-6 flex flex-col gap-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Clipboard className="w-4 h-4 text-emerald-600" />
                  <span>Resumen de Terapia Guardado</span>
                </h4>
                <div className="flex flex-col gap-3 bg-emerald-50/20 border border-emerald-100 p-5 rounded-xl text-xs">
                  <div>
                    <span className="font-semibold text-emerald-800 block mb-1">Tratamiento Aplicado:</span>
                    <p className="text-slate-600">{selectedCita.tratamientoAplicado}</p>
                  </div>
                  {selectedCita.observaciones && (
                    <div className="mt-2">
                      <span className="font-semibold text-emerald-800 block mb-1">Observaciones / Evolución:</span>
                      <p className="text-slate-600">{selectedCita.observaciones}</p>
                    </div>
                  )}
                  {selectedCita.indicacionesPostCita && (
                    <div className="mt-2">
                      <span className="font-semibold text-emerald-800 block mb-1">Indicaciones Post-Terapia:</span>
                      <p className="text-slate-600">{selectedCita.indicacionesPostCita}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ACCIONES DEL LIFECYCLE */}
            <div className="flex flex-col gap-3 pt-6 border-t border-slate-100 mt-2">
              {selectedCita.estatus === 'PROGRAMADA' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleCheckIn(selectedCita.id)}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-sm hover:shadow active:scale-95 transition flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Registrar Check-In (Iniciar)</span>
                  </button>
                  <button
                    onClick={() => handleCancelAppointment(selectedCita.id)}
                    className="py-3 px-4 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                    <span>Cancelar Turno</span>
                  </button>
                </div>
              )}

              {selectedCita.estatus === 'EN_PROCESO' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => openCloseAppointment(selectedCita)}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow active:scale-95 transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Registrar Tratamiento y Cerrar</span>
                  </button>
                  <button
                    onClick={() => handleCancelAppointment(selectedCita.id)}
                    className="py-3 px-4 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                    <span>Cancelar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── VISTA: PERFIL ─── */}
        {vista === 'perfil' && (
          <div className="max-w-xl w-full mx-auto bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 animate-fadeIn">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xl text-slate-500 border-2 border-emerald-500/20">
                {user?.alias?.charAt(0) || 'F'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{user?.username}</h3>
                <p className="text-xs text-slate-400 mt-0.5">@{user?.alias}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-100 pt-6">
              <div className="border-b border-slate-50 pb-3 flex justify-between text-xs">
                <span className="text-slate-400 font-semibold">Correo Electrónico</span>
                <span className="text-slate-700 font-bold">{user?.username}</span>
              </div>
              <div className="border-b border-slate-50 pb-3 flex justify-between text-xs">
                <span className="text-slate-400 font-semibold">Rol Asignado</span>
                <span className="text-emerald-700 font-bold capitalize">{user?.rol?.toLowerCase()}</span>
              </div>
              <div className="border-b border-slate-50 pb-3 flex justify-between text-xs">
                <span className="text-slate-400 font-semibold">ID de Clínica</span>
                <span className="text-slate-700 font-bold">{user?.clinicaId || '1 (FisioPlus Mochis)'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════
          MODAL: CREAR CITA / AGENDAR
      ═══════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-600" />
                <span>Programar Nueva Cita</span>
              </h4>
              <button 
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleAppointment} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <div className="flex flex-col">
                <label className="form-label">Paciente *</label>
                <select
                  required
                  value={formPacienteId}
                  onChange={(e) => setFormPacienteId(e.target.value)}
                  className="form-select w-full"
                >
                  <option value="">-- Selecciona un paciente --</option>
                  {pacientes.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.apellidoPaterno} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              {formPacienteId && contratos.length === 0 ? (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-lg">
                  Este paciente no tiene contratos de terapias activos en la clínica. Debes asignarle un plan antes de agendar.
                </p>
              ) : formPacienteId && (
                <div className="flex flex-col animate-fadeIn">
                  <label className="form-label">Tratamiento Contratado *</label>
                  <select
                    required
                    value={formContratoId}
                    onChange={(e) => setFormContratoId(e.target.value)}
                    className="form-select w-full"
                  >
                    {contratos.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.descripcion || c.servicio?.descripcion || `Contrato #${c.id}`} (Sesión #{c.cantidadSesiones || 'Restantes'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1 flex flex-col">
                  <label className="form-label">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="form-input w-full"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1 flex flex-col">
                  <label className="form-label">Hora Inicio *</label>
                  <input
                    type="time"
                    required
                    value={formHoraInicio}
                    onChange={(e) => setFormHoraInicio(e.target.value)}
                    className="form-input w-full"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1 flex flex-col">
                  <label className="form-label">Hora Fin *</label>
                  <input
                    type="time"
                    required
                    value={formHoraFin}
                    onChange={(e) => setFormHoraFin(e.target.value)}
                    className="form-input w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="form-label">Descripción de Sesión</label>
                <textarea
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Ej. Rehabilitación lumbar enfocada en ejercicios McKenzie y estiramientos."
                  rows={2}
                  className="form-input w-full"
                />
              </div>

              <div className="flex flex-col">
                <label className="form-label">Indicaciones Previas</label>
                <textarea
                  value={formIndicaciones}
                  onChange={(e) => setFormIndicaciones(e.target.value)}
                  placeholder="Ej. Llevar ropa cómoda y ligera. No ingerir alimentos pesados antes."
                  rows={2}
                  className="form-input w-full"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm hover:shadow transition"
                  style={{ backgroundColor: '#0f6e56' }}
                >
                  {loading ? 'Programando...' : 'Confirmar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          MODAL: CERRAR CITA / REGISTRAR NOTAS
      ═══════════════════════════════════════ */}
      {showCloseModal && selectedCita && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Cierre de Sesión Clínico</span>
              </h4>
              <button 
                onClick={() => setShowCloseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseAppointmentSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
                Registra la evolución de <strong>{selectedCita.paciente}</strong>. Estos datos se agregarán permanentemente a su valoración y expediente.
              </p>

              <div className="flex flex-col">
                <label className="form-label">Tratamiento Aplicado *</label>
                <textarea
                  required
                  value={closeTratamiento}
                  onChange={(e) => setCloseTratamiento(e.target.value)}
                  placeholder="Ej. Electroestimulación muscular durante 15 minutos en cuádriceps, seguido de 20 minutos de reeducación de marcha."
                  rows={3}
                  className="form-input w-full"
                />
              </div>

              <div className="flex flex-col">
                <label className="form-label">Evolución / Observaciones</label>
                <textarea
                  value={closeObservaciones}
                  onChange={(e) => setCloseObservaciones(e.target.value)}
                  placeholder="Ej. El paciente muestra mayor rango de extensión activa y refiere una disminución considerable de dolor lumbar."
                  rows={2}
                  className="form-input w-full"
                />
              </div>

              <div className="flex flex-col">
                <label className="form-label">Indicaciones Post-Terapia</label>
                <textarea
                  value={closeIndicaciones}
                  onChange={(e) => setCloseIndicaciones(e.target.value)}
                  placeholder="Ej. Aplicar hielo local durante 15 minutos dos veces al día. Realizar ejercicios de estiramiento enseñados."
                  rows={2}
                  className="form-input w-full"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm hover:shadow transition bg-emerald-600 hover:bg-emerald-700"
                >
                  Confirmar y Guardar Expediente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}