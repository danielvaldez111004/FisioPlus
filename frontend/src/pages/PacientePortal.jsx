import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { citaService } from "../services/citaService";
import Calendar from "../components/Calendar";
import { 
  CalendarDays, 
  Clock, 
  User, 
  Plus, 
  Info, 
  CheckCircle, 
  AlertCircle, 
  Bell,
  LogOut,
  QrCode,
  Shield,
  FileText,
  X,
  ChevronRight,
  Activity
} from 'lucide-react';
import api from '../services/api';

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const colors = {
  teal50: "#E1F5EE", teal100: "#9FE1CB", teal200: "#5DCAA5",
  teal400: "#1D9E75", teal600: "#0F6E56", teal800: "#085041",
  blue50: "#E6F1FB", blue100: "#B5D4F4", blue200: "#85B7EB",
  blue400: "#378ADD", blue600: "#185FA5", blue800: "#0C447C",
  amber50: "#FAEEDA", amber100: "#FAC775", amber400: "#BA7517",
  amber600: "#854F0B",
  red50: "#FCEBEB", red100: "#F7C1C1", red400: "#E24B4A", red600: "#A32D2D",
  green50: "#EAF3DE", green100: "#C0DD97", green400: "#639922", green600: "#3B6D11",
  gray50: "#F8F7F4", gray100: "#E2E0D5", gray200: "#B4B2A9",
  gray400: "#888780", gray600: "#5F5E5A", gray800: "#444441",
};

const statusColors = {
  PROGRAMADA: { bg: colors.blue50, text: colors.blue600, border: colors.blue100 },
  EN_PROCESO: { bg: colors.amber50, text: colors.amber600, border: colors.amber100 },
  TERMINADA: { bg: colors.green50, text: colors.green600, border: colors.green100 },
  CANCELADA: { bg: colors.red50, text: colors.red600, border: colors.red100 },
};

// ─── MOCK BACKUP DATA ────────────────────────────────────────────────────────
const INITIAL_MOCK_CITAS = [
  {
    id: 1, 
    descripcion: "Terapia lumbar - sesión 3",
    paciente: "María González", 
    fisioterapeuta: "Santiago Valdez",
    fisioterapeutaId: 2,
    fechaInicio: "2026-05-23T09:00:00", 
    fechaFin: "2026-05-23T10:00:00",
    numeroSesion: 3, 
    estatus: "EN_PROCESO",
    servicio: "Rehabilitación lumbar (10 sesiones)",
    servicioContratadoId: 1,
    indicacionesPrevioCita: "Llevar ropa cómoda. No comer 1h antes.",
    indicacionesPostCita: "Aplicar hielo 15 min cada 4 horas. Realizar ejercicios indicados.",
    tratamientoAplicado: "Ultrasonido terapéutico, TENS, ejercicios de McKenzie",
    observaciones: "Paciente muestra mejoría notable en flexión lumbar.",
  },
  {
    id: 2, 
    descripcion: "Terapia lumbar - sesión 4",
    paciente: "María González", 
    fisioterapeuta: "Santiago Valdez",
    fisioterapeutaId: 2,
    fechaInicio: "2026-05-26T09:00:00", 
    fechaFin: "2026-05-26T10:00:00",
    numeroSesion: 4, 
    estatus: "PROGRAMADA",
    servicio: "Rehabilitación lumbar (10 sesiones)",
    servicioContratadoId: 1,
    indicacionesPrevioCita: "Llevar ropa cómoda. No comer 1h antes.",
  },
  {
    id: 3, 
    descripcion: "Terapia lumbar - sesión 5",
    paciente: "María González", 
    fisioterapeuta: "Santiago Valdez",
    fisioterapeutaId: 2,
    fechaInicio: "2026-05-29T09:00:00", 
    fechaFin: "2026-05-29T10:00:00",
    numeroSesion: 5, 
    estatus: "PROGRAMADA",
    servicio: "Rehabilitación lumbar (10 sesiones)",
    servicioContratadoId: 1,
  },
];

const MOCK_NOTIFICACIONES = [
  { id: 1, tipo: "post_cita", leida: false, fecha: "2026-05-23T10:30:00", titulo: "Indicaciones post-cita", mensaje: "Aplicar hielo 15 min cada 4 horas. Realizar ejercicios indicados por su fisioterapeuta.", cita: "Terapia lumbar - sesión 3" },
  { id: 2, tipo: "confirmacion", leida: false, fecha: "2026-05-21T08:00:00", titulo: "Cita confirmada", mensaje: "Su cita del 26 de mayo a las 09:00 hrs con Santiago Valdez ha sido confirmada.", cita: "Terapia lumbar - sesión 4" },
];

const MOCK_FISIOTERAPEUTAS = [
  { id: 2, nombre: "Santiago", apellidoPaterno: "Valdez", especialidad: "Rehabilitación musculoesquelética", disponibilidad: ["Lun-Vie 08:00-14:00"], email: "svaldez@fisioplus.com" },
  { id: 3, nombre: "Laura", apellidoPaterno: "Martínez", especialidad: "Fisioterapia neurológica", disponibilidad: ["Lun-Vie 14:00-20:00"], email: "lmartinez@fisioplus.com" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtFecha = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};
const fmtHora = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
};
const fmtDateTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) + " " + fmtHora(iso);
};

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
const Badge = ({ estatus }) => {
  const c = statusColors[estatus] || statusColors.PROGRAMADA;
  const labels = { PROGRAMADA: "Programada", EN_PROCESO: "En curso", TERMINADA: "Terminada", CANCELADA: "Cancelada" };
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {labels[estatus] || estatus}
    </span>
  );
};

const Avatar = ({ nombre, size = 44, color = colors.teal400 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: color + "15", border: `1.5px solid ${color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.38, color, flexShrink: 0 }}>
    {nombre?.charAt(0).toUpperCase()}
  </div>
);

const Card = ({ children, style = {}, onClick }) => (
  <div 
    onClick={onClick} 
    style={{ background: "#fff", border: "1px solid #f1eff4", borderRadius: 16, padding: "1.25rem", cursor: onClick ? "pointer" : "default", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", ...style }}
    className="transition duration-150 hover:shadow-md"
  >
    {children}
  </div>
);

const MetricCard = ({ label, value, icon, color = colors.teal400 }) => (
  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 18, color }}>{icon}</span>
      <span style={{ fontSize: 11, color: "#888", fontWeight: 600, uppercase: true }}>{label}</span>
    </div>
    <span style={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}>{value}</span>
  </div>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Btn = ({ children, onClick, variant = "primary", size = "md", color = colors.teal600, style = {}, type = "button" }) => {
  const styles = {
    primary: { background: color, color: "#fff", border: "none" },
    outline: { background: "transparent", color, border: `1.5px solid ${color}` },
    ghost: { background: "transparent", color: "#64748b", border: "1px solid #e2e8f0" },
  };
  const sizes = { sm: { padding: "6px 14px", fontSize: 11 }, md: { padding: "8px 18px", fontSize: 13 }, lg: { padding: "12px 24px", fontSize: 14 } };
  return (
    <button type={type} onClick={onClick} style={{ ...sizes[size], ...styles[variant], borderRadius: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", ...style }}
      className="active:scale-95 hover:opacity-90">
      {children}
    </button>
  );
};

const QRMock = ({ citaId }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
    <div style={{ width: 150, height: 150, border: `3.5px solid ${colors.teal400}`, borderRadius: 16, display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 2, padding: 12, background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
      {Array.from({ length: 64 }).map((_, i) => {
        const pattern = [0,1,1,0,1,0,1,1,1,0,0,1,0,1,0,0,1,1,0,1,1,0,1,1,0,0,1,0,0,1,0,1,1,0,1,1,1,0,0,0,0,1,0,0,1,1,0,1,1,0,1,0,0,1,1,0,1,1,0,1,0,0,1,0];
        return <div key={i} style={{ background: pattern[i] ? colors.teal600 : "#fff", borderRadius: 1 }} />;
      })}
    </div>
    <p style={{ fontSize: 11, color: "#8492a6", margin: 0, fontWeight: 600 }}>Cita #{citaId} — Pase de Entrada</p>
  </div>
);

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

// Dashboard
const DashboardPaciente = ({ onNavigate, citas = [], notificaciones = [] }) => {
  const proximas = citas.filter(c => c.estatus === "PROGRAMADA" || c.estatus === "EN_PROCESO");
  const historial = citas.filter(c => c.estatus === "TERMINADA");
  const noLeidas = notificaciones.filter(n => !n.leida).length;
  const [citaQR, setCitaQR] = useState(null);
  const { user } = useAuth();
 
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} className="animate-fadeIn">
      {/* Bienvenida */}
      <div style={{ background: `linear-gradient(135deg, ${colors.teal50} 0%, ${colors.blue50} 100%)`, borderRadius: 20, padding: "1.5rem", border: `1px solid ${colors.teal100}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar nombre={user?.alias || "M"} size={52} color={colors.teal600} />
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.teal850 }}>
              ¡Hola, {user?.alias || user?.username}! 👋
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: colors.teal600, fontWeight: 600 }}>
              FisioPlus Clinic — Tu Salud en Movimiento
            </p>
          </div>
        </div>
      </div>
 
      {/* Métricas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <MetricCard label="Próximas Citas" value={proximas.length} icon="📅" color={colors.teal600} />
        <MetricCard label="Sesiones Tomadas" value={historial.length} icon="✅" color={colors.teal400} />
        <MetricCard label="Avisos" value={noLeidas} icon="🔔" color={noLeidas > 0 ? colors.amber600 : "#94a3b8"} />
      </div>
 
      {/* Cita en curso */}
      {citas.filter(c => c.estatus === "EN_PROCESO").map(cita => (
        <Card key={cita.id} style={{ border: `1.5px solid ${colors.amber100}`, background: colors.amber50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors.amber400, display: "inline-block" }} className="animate-ping" />
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.amber600 }}>Sesión Iniciada — Pasa a tu Terapia</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontWeight: 750, fontSize: 14 }}>{cita.descripcion}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>Con {cita.fisioterapeuta} · {fmtHora(cita.fechaInicio)} – {fmtHora(cita.fechaFin)}</p>
            </div>
            <Btn onClick={() => setCitaQR(cita)} size="sm" color={colors.amber600}>Ver QR</Btn>
          </div>
        </Card>
      ))}
 
      {/* Próximas citas */}
      <div>
        <SectionHeader 
          title="Tus Próximas Citas" 
          action={<Btn onClick={() => onNavigate("agenda")} variant="outline" size="sm">Ver historial</Btn>} 
        />
        
        {proximas.filter(c => c.estatus !== "EN_PROCESO").length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center text-slate-400 text-xs">
            No tienes citas agendadas por ahora.
          </div>
        ) : (
          proximas.filter(c => c.estatus !== "EN_PROCESO").map(cita => (
            <Card key={cita.id} style={{ marginBottom: 10 }} onClick={() => onNavigate("detalleCita", cita)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Badge estatus={cita.estatus} />
                    <span style={{ fontSize: 11, color: "#888", fontWeight: 650 }}>Sesión {cita.numeroSesion}</span>
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{cita.descripcion}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                    {fmtFecha(cita.fechaInicio)} a las {fmtHora(cita.fechaInicio)} · Fisioterapeuta: {cita.fisioterapeuta}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </div>
            </Card>
          ))
        )}
      </div>
 
      {/* Accesos rápidos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Btn onClick={() => onNavigate("agendar")} size="lg" color={colors.teal600} style={{ width: "100%", boxShadow: "0 4px 10px rgba(15,110,86,0.15)" }}>
          + Reservar Cita
        </Btn>
        <Btn onClick={() => onNavigate("notificaciones")} variant="outline" size="lg" style={{ width: "100%" }}>
          🔔 Avisos {noLeidas > 0 && `(${noLeidas})`}
        </Btn>
      </div>
 
      {/* Modal QR simulator */}
      {citaQR && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setCitaQR(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl flex flex-col items-center gap-4 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-full flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm">QR de Entrada</h4>
              <button onClick={() => setCitaQR(null)} className="text-slate-400 hover:text-slate-700">×</button>
            </div>
            <QRMock citaId={citaQR.id} />
            <p style={{ fontSize: 12, color: "#64748b", maxWidth: 260 }}>
              Presenta este código al ingresar a la clínica para marcar tu llegada automáticamente en el sistema.
            </p>
            <div style={{ background: colors.blue50, borderRadius: 12, padding: "12px", width: "100%" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: colors.blue800 }}>{citaQR.descripcion}</p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: colors.blue600, fontWeight: 600 }}>{fmtFecha(citaQR.fechaInicio)} · {fmtHora(citaQR.fechaInicio)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Agenda
const AgendaPaciente = ({ onNavigate, citas = [] }) => {
  const [filtro, setFiltro] = useState("todas");
  const filtradas = filtro === "todas" ? citas : citas.filter(c => c.estatus === filtro);
 
  return (
    <div className="animate-fadeIn">
      <SectionHeader 
        title="Historial de Citas" 
        subtitle="Expediente y próximas sesiones" 
        action={<Btn onClick={() => onNavigate("agendar")} size="sm">+ Agendar</Btn>} 
      />
      
      <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {["todas", "PROGRAMADA", "EN_PROCESO", "TERMINADA", "CANCELADA"].map(f => (
          <button 
            key={f} 
            onClick={() => setFiltro(f)} 
            style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", border: filtro === f ? `1.5px solid ${colors.teal600}` : "1px solid #e2e8f0", background: filtro === f ? colors.teal50 : "#fff", color: filtro === f ? colors.teal600 : "#64748b", transition: "all 0.15s" }}
          >
            {f === "todas" ? "Todas" : f === "PROGRAMADA" ? "Programadas" : f === "EN_PROCESO" ? "En curso" : f === "TERMINADA" ? "Completadas" : "Canceladas"}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 text-xs">
          No se encontraron citas en esta categoría.
        </div>
      ) : (
        filtradas.map(cita => (
          <Card key={cita.id} style={{ marginBottom: 10 }} onClick={() => onNavigate("detalleCita", cita)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                  <Badge estatus={cita.estatus} />
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 650 }}>Sesión {cita.numeroSesion}</span>
                </div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{cita.descripcion}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                  {fmtFecha(cita.fechaInicio)} · {fmtHora(cita.fechaInicio)} – {fmtHora(cita.fechaFin)}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>👤 Dr(a). {cita.fisioterapeuta} · {cita.servicio}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

// Detalle Cita
const DetalleCitaPaciente = ({ cita, onBack }) => {
  const [showQR, setShowQR] = useState(false);
  return (
    <div className="max-w-2xl w-full mx-auto bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 animate-fadeIn">
      <button onClick={onBack} className="text-xs font-bold text-teal-600 hover:text-teal-700 transition flex items-center gap-1 self-start">
        ← Volver al historial
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #f1eff4", paddingBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{cita.descripcion}</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Sesión número {cita.numeroSesion}</p>
        </div>
        <Badge estatus={cita.estatus} />
      </div>
 
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Información General</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="bg-slate-50/50 p-4 rounded-xl">
          {[
            ["Fecha", fmtFecha(cita.fechaInicio)], 
            ["Horario", `${fmtHora(cita.fechaInicio)} – ${fmtHora(cita.fechaFin)}`], 
            ["Fisioterapeuta", cita.fisioterapeuta], 
            ["Especialidad / Servicio", cita.servicio]
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
              <span style={{ color: "#64748b", fontWeight: 500 }}>{k}</span>
              <span style={{ fontWeight: 700, color: "#1e293b" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
 
      {cita.indicacionesPrevioCita && (
        <div className="bg-blue-50/40 border border-blue-100 p-4 rounded-xl">
          <h4 style={{ margin: "0 0 6px", fontSize: 12, color: colors.blue800, fontWeight: 700 }}>📋 Indicaciones de Preparación</h4>
          <p style={{ margin: 0, fontSize: 12, color: colors.blue800, lineHeight: 1.6 }}>{cita.indicacionesPrevioCita}</p>
        </div>
      )}
 
      {cita.tratamientoAplicado && (
        <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-3">
          <h4 style={{ margin: 0, fontSize: 12, color: "#1e293b", fontWeight: 700 }}>🩺 Bitácora del Fisioterapeuta</h4>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase mb-0.5">Tratamiento Aplicado:</span>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "#475569" }}>{cita.tratamientoAplicado}</p>
          </div>
          {cita.observaciones && (
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase mb-0.5">Observaciones de Evolución:</span>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "#475569" }}>{cita.observaciones}</p>
            </div>
          )}
        </div>
      )}
 
      {cita.indicacionesPostCita && (
        <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl">
          <h4 style={{ margin: "0 0 6px", fontSize: 12, color: colors.green600, fontWeight: 700 }}>✅ Cuidados Post-Sesión</h4>
          <p style={{ margin: 0, fontSize: 12, color: colors.green600, lineHeight: 1.6 }}>{cita.indicacionesPostCita}</p>
        </div>
      )}
 
      {(cita.estatus === "PROGRAMADA" || cita.estatus === "EN_PROCESO") && (
        <Btn onClick={() => setShowQR(true)} size="lg" color={colors.teal600} style={{ width: "100%", marginTop: 8 }}>
          📱 Mostrar Pase Lector QR
        </Btn>
      )}
 
      {/* Modal QR */}
      {showQR && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col items-center gap-4 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-full flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm">QR de Registro</h4>
              <button onClick={() => setShowQR(false)} className="text-slate-400 hover:text-slate-700">×</button>
            </div>
            <QRMock citaId={cita.id} />
            <p style={{ fontSize: 12, color: "#64748b" }}>Acerca la pantalla del celular al lector al entrar al consultorio.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Agendar Cita Wizard with embedded FullCalendar
const AgendarCita = ({ onBack, onComplete, allAppointments = [] }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [fisioSel, setFisioSel] = useState(null);
  
  // Selection dates
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [fechaStr, setFechaStr] = useState("");
  const [horaStr, setHoraStr] = useState("");
  
  const [contratos, setContratos] = useState([]);
  const [contratoSelId, setContratoSelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [citasFisioterapeuta, setCitasFisioterapeuta] = useState([]);

  // Load patient's contracts
  useEffect(() => {
    if (!user?.userId) return;
    const loadContracts = async () => {
      try {
        const data = await citaService.getServiciosContratados(user.userId);
        if (Array.isArray(data) && data.length > 0) {
          setContratos(data);
          setContratoSelId(data[0].id);
        } else {
          // fallback
          const fallbackList = [{ id: 1, descripcion: "Tratamiento Fisioterapéutico Base (10 sesiones)", cantidadSesiones: 10 }];
          setContratos(fallbackList);
          setContratoSelId(fallbackList[0].id);
        }
      } catch (e) {
        const fallbackList = [{ id: 1, descripcion: "Tratamiento Fisioterapéutico Base (10 sesiones)", cantidadSesiones: 10 }];
        setContratos(fallbackList);
        setContratoSelId(fallbackList[0].id);
      }
    };
    loadContracts();
  }, [user]);

  // When therapist is chosen, load all appointments to show busy slots
  useEffect(() => {
    if (!fisioSel) return;
    
    // We filter appointments matching the chosen physiotherapist
    // We map appointments of other patients as 'Ocupado' to respect privacy.
    const loadTherapistBusySlots = async () => {
      try {
        const response = await citaService.getCitas();
        if (Array.isArray(response)) {
          const therapistCitas = response.filter(c => Number(c.fisioterapeutaId) === Number(fisioSel.id));
          const formatted = therapistCitas.map(c => {
            const isMine = String(c.servicioContratado?.pacienteId) === String(user?.userId);
            return {
              id: c.id,
              title: isMine ? (c.descripcion || "Mi cita") : "Ocupado",
              fechaInicio: c.fechaInicio,
              fechaFin: c.fechaFin,
              estatus: isMine ? c.estatus : "CANCELADA", // Use CANCELADA colors (red/rose) or a custom state to render grey
              numeroSesion: isMine ? c.numeroSesion : null,
              paciente: isMine ? "Mi Cita" : "Horario Reservado"
            };
          });
          setCitasFisioterapeuta(formatted);
        } else {
          fallbackMockTherapist();
        }
      } catch (err) {
        fallbackMockTherapist();
      }
    };

    const fallbackMockTherapist = () => {
      const filteredMocks = allAppointments
        .filter(c => Number(c.fisioterapeutaId) === Number(fisioSel.id))
        .map(c => {
          const isMine = Number(c.pacienteId) === Number(user?.userId);
          return {
            id: c.id,
            title: isMine ? c.descripcion : "Ocupado",
            fechaInicio: c.fechaInicio || c.start,
            fechaFin: c.fechaFin || c.end,
            estatus: isMine ? c.estatus : "CANCELADA",
            numeroSesion: isMine ? c.numeroSesion : null,
            paciente: isMine ? "Mi Cita" : "Horario Reservado"
          };
        });
      setCitasFisioterapeuta(filteredMocks);
    };

    loadTherapistBusySlots();
  }, [fisioSel, allAppointments, user]);

  const handleDateSelect = (slotInfo) => {
    // Check if slot overlaps with any occupied slot
    const start = new Date(slotInfo.startStr);
    const end = new Date(slotInfo.endStr);
    
    // Check collision
    const collision = citasFisioterapeuta.some(c => {
      const cStart = new Date(c.fechaInicio);
      const cEnd = new Date(c.fechaFin);
      return (start < cEnd && end > cStart);
    });

    if (collision) {
      alert("Este horario ya está ocupado por otra cita. Por favor selecciona un espacio libre.");
      return;
    }

    // Capture selection
    setSelectedStart(slotInfo.startStr);
    setSelectedEnd(slotInfo.endStr);
    
    const dateStr = start.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    const timeStr = start.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) + " - " + end.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    
    setFechaStr(dateStr);
    setHoraStr(timeStr);
    setStep(3); // Go to confirm step
  };

  const handleConfirmBooking = async () => {
    if (!contratoSelId) {
      alert("Debes seleccionar un plan de tratamiento activo.");
      return;
    }

    const payload = {
      servicioContratadoId: Number(contratoSelId),
      fisioterapeutaId: Number(fisioSel.id),
      fechaInicio: selectedStart,
      fechaFin: selectedEnd,
      descripcion: `Sesión de terapia con ${fisioSel.nombre} ${fisioSel.apellidoPaterno}`,
      indicacionesPrevioCita: "Llevar ropa cómoda. Presentarse 10 min antes."
    };

    setLoading(true);
    try {
      const response = await citaService.createCita(payload);
      alert("¡Cita agendada con éxito en el sistema!");
      onComplete();
    } catch (err) {
      console.warn("Backend offline: confirmando agendamiento local en memoria.");
      // fallback mock update
      const newCita = {
        id: Date.now(),
        descripcion: `Sesión de terapia con ${fisioSel.nombre} ${fisioSel.apellidoPaterno}`,
        paciente: "Paciente",
        fisioterapeuta: `${fisioSel.nombre} ${fisioSel.apellidoPaterno}`,
        fisioterapeutaId: fisioSel.id,
        fechaInicio: selectedStart,
        fechaFin: selectedEnd,
        numeroSesion: 4,
        estatus: "PROGRAMADA",
        servicio: "Fisioterapia",
        servicioContratadoId: Number(contratoSelId)
      };
      alert("¡Cita agendada con éxito!");
      onComplete(newCita);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 animate-fadeIn">
      <button onClick={onBack} className="text-xs font-bold text-teal-600 hover:text-teal-700 transition flex items-center gap-1 self-start">
        ← Cancelar y salir
      </button>
      <h2 style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 800, color: "#1e293b" }}>Reservar una Nueva Cita</h2>
 
      {/* Stepper */}
      <div style={{ display: "flex", gap: 12, marginBottom: "0.5rem", alignItems: "center" }} className="border-b border-slate-50 pb-4 overflow-x-auto">
        {["Fisioterapeuta", "Fecha y Horario", "Confirmar"].map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: step > i + 1 ? colors.teal600 : step === i + 1 ? colors.teal600 : "#f1f5f9", color: step >= i + 1 ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyBox: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
              {step > i + 1 ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 12, color: step === i + 1 ? colors.teal600 : "#94a3b8", fontWeight: step === i + 1 ? 700 : 500 }}>{s}</span>
            {i < 2 && <span style={{ color: "#cbd5e1", fontSize: 12 }}>›</span>}
          </div>
        ))}
      </div>
 
      {/* STEP 1: SELECT THERAPIST */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <p style={{ fontSize: 13, color: "#64748b", margin: 0, fontWeight: 500 }}>
            Selecciona el fisioterapeuta con el que deseas agendar tu terapia:
          </p>
          {MOCK_FISIOTERAPEUTAS.map(f => (
            <div 
              key={f.id} 
              onClick={() => setFisioSel(f)} 
              className={`p-4 border rounded-2xl cursor-pointer transition flex items-center justify-between hover:border-teal-500 hover:shadow-sm ${
                fisioSel?.id === f.id ? "border-teal-600 bg-teal-50/20" : "border-slate-100"
              }`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar nombre={f.nombre} size={46} color={colors.teal600} />
                <div>
                  <p style={{ margin: 0, fontWeight: 750, color: "#1e293b" }}>{f.nombre} {f.apellidoPaterno}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748b", fontWeight: 500 }}>{f.especialidad}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: colors.teal600, fontWeight: 650 }}>⏰ Horarios: {f.disponibilidad[0]}</p>
                </div>
              </div>
              {fisioSel?.id === f.id && <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs">✓</div>}
            </div>
          ))}
          <Btn onClick={() => fisioSel && setStep(2)} size="lg" color={colors.teal600} style={{ width: "100%", marginTop: 8, opacity: fisioSel ? 1 : 0.6 }} disabled={!fisioSel}>
            Continuar a disponibilidad →
          </Btn>
        </div>
      )}
 
      {/* STEP 2: FULLCALENDAR SELECT TIME SLOT */}
      {step === 2 && fisioSel && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold">Fisioterapeuta seleccionado</p>
              <p className="text-sm font-bold text-slate-700">{fisioSel.nombre} {fisioSel.apellidoPaterno}</p>
            </div>
            <button onClick={() => setStep(1)} className="text-xs font-bold text-teal-600 hover:underline">Cambiar</button>
          </div>

          <div className="bg-amber-50 border border-amber-100 text-[11px] text-amber-800 p-3 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="m-0 leading-relaxed font-semibold">
              <strong>Indicación:</strong> Haz clic en un espacio vacío disponible en el calendario semanal (horas sin reservaciones en rojo/gris) para elegir tu turno.
            </p>
          </div>

          <Calendar
            events={citasFisioterapeuta}
            selectable={true}
            initialView="timeGridWeek"
            height="500px"
            onDateSelect={handleDateSelect}
          />
          
          <Btn onClick={() => setStep(1)} variant="ghost" size="lg" style={{ width: "100%" }}>← Regresar</Btn>
        </div>
      )}
 
      {/* STEP 3: CONFIRM BOOKING */}
      {step === 3 && fisioSel && (
        <div className="flex flex-col gap-5">
          <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl flex flex-col gap-3">
            <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: colors.teal800 }}>Confirmación de Reservación</h4>
            {[
              ["Fisioterapeuta", `${fisioSel.nombre} ${fisioSel.apellidoPaterno}`],
              ["Especialidad", fisioSel.especialidad],
              ["Fecha Agendada", fechaStr],
              ["Horario de Turno", horaStr]
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: `1.5px solid ${colors.teal100}20`, paddingBottom: 6 }}>
                <span style={{ color: colors.teal600, fontWeight: 550 }}>{k}</span>
                <span style={{ fontWeight: 750, color: colors.teal800 }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="form-label text-slate-400">Tratamiento Asignado para Descontar Turno *</label>
            <select
              required
              value={contratoSelId}
              onChange={e => setContratoSelId(e.target.value)}
              className="form-select w-full"
            >
              {contratos.map(c => (
                <option key={c.id} value={c.id}>
                  {c.descripcion || `Plan #${c.id}`} ({c.cantidadSesiones || "Activo"} Terapias)
                </option>
              ))}
            </select>
          </div>
          
          <p style={{ fontSize: 11, color: "#888", margin: 0 }} className="leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
            Al agendar, el turno quedará reservado automáticamente y el fisioterapeuta será notificado. Podrás ver tu código QR de acceso en el Dashboard principal.
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => setStep(2)} variant="ghost" size="lg" style={{ flex: 1 }}>← Atrás</Btn>
            <Btn onClick={handleConfirmBooking} disabled={loading} size="lg" color={colors.teal600} style={{ flex: 2 }}>
              {loading ? "Confirmando..." : "✓ Reservar Turno"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
};

// Avisos / Notificaciones
const NotificacionesPaciente = ({ notifications = [], onMarkAllRead }) => {
  const [notifs, setNotifs] = useState(notifications);
  const iconos = { post_cita: "🩺", confirmacion: "📅", cancelacion: "❌" };
 
  return (
    <div className="animate-fadeIn">
      <SectionHeader 
        title="Buzón de Avisos" 
        subtitle={`${notifs.filter(n => !n.leida).length} avisos sin leer`}
        action={<Btn onClick={() => { onMarkAllRead(); setNotifs(n => n.map(x => ({ ...x, leida: true }))); }} variant="ghost" size="sm">Leídos todos</Btn>} 
      />
      {notifs.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 text-xs">
          No tienes notificaciones pendientes.
        </div>
      ) : (
        notifs.map(n => (
          <Card key={n.id} style={{ marginBottom: 10, opacity: n.leida ? 0.65 : 1, borderLeft: n.leida ? "1px solid #f1f5f9" : `3.5px solid ${colors.teal600}` }}
            onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, leida: true } : x))}>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 24 }}>{iconos[n.tipo] || "🔔"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyBox: "between", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: n.leida ? 600 : 800, fontSize: 13, color: "#1e293b" }}>{n.titulo}</span>
                  <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>{fmtDateTime(n.fecha)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{n.mensaje}</p>
                <p style={{ margin: "6px 0 0", fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>📋 Cita relacionada: {n.cita}</p>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

// Perfil
const PerfilPaciente = () => {
  const { user } = useAuth();
  const [editando, setEditando] = useState(false);
  const [telefono, setTelefono] = useState("667-123-4567");
  const [direccion, setDireccion] = useState("Av. Principal #100, Los Mochis, Sin.");

  return (
    <div className="max-w-xl w-full mx-auto flex flex-col gap-4 animate-fadeIn">
      <SectionHeader 
        title="Expediente de Paciente" 
        action={<Btn onClick={() => setEditando(!editando)} variant="outline" size="sm">{editando ? "Cancelar" : "Editar Datos"}</Btn>} 
      />
      
      <Card style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <Avatar nombre={user?.alias || "M"} size={60} color={colors.teal600} />
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>{user?.username}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888", fontWeight: 600 }}>Paciente Acreditado</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="form-label text-slate-400">Usuario Portal</label>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{user?.username}</p>
          </div>
          <div>
            <label className="form-label text-slate-400">Alias de Acceso</label>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{user?.alias || "Sin alias"}</p>
          </div>
          <div>
            <label className="form-label text-slate-400">Teléfono Móvil</label>
            {editando ? (
              <input value={telefono} onChange={e => setTelefono(e.target.value)} className="form-input" />
            ) : (
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{telefono}</p>
            )}
          </div>
          <div>
            <label className="form-label text-slate-400 font-bold">Dirección Residencial</label>
            {editando ? (
              <input value={direccion} onChange={e => setDireccion(e.target.value)} className="form-input" />
            ) : (
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{direccion}</p>
            )}
          </div>
        </div>

        {editando && (
          <Btn onClick={() => setEditando(false)} size="md" color={colors.teal600} style={{ width: "100%", marginTop: 20 }}>
            Guardar Cambios en Expediente
          </Btn>
        )}
      </Card>

      <Card>
        <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, color: "#1e293b" }}>Seguridad y Acceso</h4>
        <div style={{ marginBottom: 12 }}>
          <label className="form-label text-slate-400">Contraseña Actual</label>
          <input type="password" placeholder="••••••••" className="form-input" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="form-label text-slate-400">Nueva Contraseña</label>
          <input type="password" placeholder="Mínimo 6 caracteres" className="form-input" />
        </div>
        <Btn size="md" variant="outline" style={{ width: "100%" }}>Actualizar Credenciales</Btn>
      </Card>
    </div>
  );
};

// MAIN PORTAL
const PacientePortal = () => {
  const { logout, user } = useAuth();
  const [vista, setVista] = useState("dashboard");
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  
  // Stateful collections
  const [citas, setCitas] = useState(INITIAL_MOCK_CITAS);
  const [notificaciones, setNotificaciones] = useState(MOCK_NOTIFICACIONES);
  const [loading, setLoading] = useState(false);

  // Fetch appointments for this patient
  const loadCitas = async () => {
    setLoading(true);
    try {
      const data = await citaService.getCitas();
      if (Array.isArray(data)) {
        // Map Spring backend model to our state
        const mapped = data.map(c => ({
          id: c.id,
          descripcion: c.descripcion || "Terapia de rehabilitación",
          paciente: "Paciente",
          fisioterapeuta: c.fisioterapeuta 
            ? `${c.fisioterapeuta.nombre} ${c.fisioterapeuta.apellidoPaterno}`
            : "Santiago Valdez",
          fisioterapeutaId: c.fisioterapeutaId,
          fechaInicio: c.fechaInicio,
          fechaFin: c.fechaFin,
          numeroSesion: c.numeroSesion,
          estatus: c.estatus,
          servicio: c.servicioContratado?.servicio?.descripcion || "Fisioterapia",
          servicioContratadoId: c.servicioContratadoId,
          indicacionesPrevioCita: c.indicacionesPrevioCita,
          indicacionesPostCita: c.indicacionesPostCita,
          tratamientoAplicado: c.tratamientoAplicado,
          observaciones: c.observaciones
        }));
        setCitas(mapped);
      }
    } catch (err) {
      console.warn("REST API offline: cargando listado local para PacientePortal.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCitas();
  }, []);

  const navigate = (screen, data = null) => {
    setVista(screen);
    if (data) {
      setCitaSeleccionada(data);
    }
  };

  const handleMarkAllNotificationsRead = () => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Navbar header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">
            Fisio<span className="text-teal-600">Plus</span>
            <span className="text-xs font-semibold bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full ml-2">Paciente</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">{user?.alias || user?.username}</p>
            <p className="text-xs text-slate-400 uppercase">Expediente Activo</p>
          </div>
          <button 
            onClick={logout} 
            className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl shadow-sm text-slate-600 hover:bg-slate-50 transition active:scale-95"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Main container */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Navigation tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => navigate("dashboard")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 ${
                vista === 'dashboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Inicio
            </button>
            <button
              onClick={() => navigate("agenda")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 ${
                vista === 'agenda' || vista === 'detalleCita' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Mi Agenda
            </button>
            <button
              onClick={() => navigate("perfil")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 ${
                vista === 'perfil' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Expediente
            </button>
          </div>

          {vista !== 'agendar' && (
            <button
              onClick={() => navigate("agendar")}
              className="btn-primary"
              style={{ backgroundColor: colors.teal600 }}
            >
              <Plus className="w-4 h-4" />
              <span>Agendar Sesión</span>
            </button>
          )}
        </div>

        {/* Content routing views */}
        {vista === "dashboard" && (
          <DashboardPaciente 
            onNavigate={navigate} 
            citas={citas} 
            notificaciones={notificaciones} 
          />
        )}

        {vista === "agenda" && (
          <AgendaPaciente 
            onNavigate={navigate} 
            citas={citas} 
          />
        )}

        {vista === "detalleCita" && citaSeleccionada && (
          <DetalleCitaPaciente
            cita={citaSeleccionada}
            onBack={() => navigate("agenda")}
          />
        )}

        {vista === "agendar" && (
          <AgendarCita 
            onBack={() => navigate("dashboard")} 
            allAppointments={citas}
            onComplete={async (newCita) => {
              if (newCita) {
                setCitas(prev => [...prev, newCita]);
              } else {
                await loadCitas();
              }
              navigate("dashboard");
            }}
          />
        )}

        {vista === "notificaciones" && (
          <NotificacionesPaciente 
            notifications={notificaciones}
            onMarkAllRead={handleMarkAllNotificationsRead}
          />
        )}

        {vista === "perfil" && (
          <PerfilPaciente />
        )}
      </div>
    </div>
  );
};

export default PacientePortal;