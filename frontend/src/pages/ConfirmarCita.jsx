import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

// ─── Estilos inline para que la página funcione sin depender del layout global ─

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    padding: '36px',
    maxWidth: '500px',
    width: '100%',
  },
  logo: { color: '#0284c7', fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' },
  subtitle: { color: '#64748b', fontSize: '14px', marginBottom: '24px' },
  fechaBox: {
    background: '#f0f9ff',
    borderLeft: '4px solid #0ea5e9',
    padding: '14px 16px',
    borderRadius: '0 8px 8px 0',
    marginBottom: '24px',
  },
  fechaText: { margin: 0, color: '#0c4a6e', fontWeight: 'bold', fontSize: '15px' },
  btnGroup: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' },
  btn: {
    padding: '14px 20px', borderRadius: '10px', border: 'none',
    fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
    width: '100%', transition: 'opacity 0.15s',
  },
  btnConfirmar: { background: '#22c55e', color: '#fff' },
  btnCancelar:  { background: '#ef4444', color: '#fff' },
  btnReagendar: { background: '#f59e0b', color: '#fff' },
  btnSecondary: { background: '#e2e8f0', color: '#475569' },
  alertSuccess: { background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '16px', borderRadius: '10px', marginBottom: '16px' },
  alertError:   { background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '16px', borderRadius: '10px', marginBottom: '16px' },
  alertInfo:    { background: '#eff6ff', border: '1px solid #93c5fd', color: '#1e40af', padding: '16px', borderRadius: '10px', marginBottom: '16px' },
  alertWarning: { background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', padding: '16px', borderRadius: '10px', marginBottom: '16px' },
  input: {
    width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1',
    borderRadius: '8px', fontSize: '14px', marginTop: '6px',
    boxSizing: 'border-box',
  },
  label: { display: 'block', color: '#374151', fontWeight: '600', fontSize: '14px', marginTop: '12px' },
  spinner: { textAlign: 'center', padding: '40px', color: '#64748b' },
  footnote: { color: '#94a3b8', fontSize: '12px', textAlign: 'center', marginTop: '12px' },
};

// ─── Formateador de fechas ────────────────────────────────────────────────────

function formatFecha(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('es-MX', {
    weekday: 'long', day: '2-digit', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConfirmarCita() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const accionParam = searchParams.get('accion'); // CONFIRMAR | CANCELAR | REAGENDAR (desde email)

  const [estado, setEstado] = useState(null);      // Estado del token desde el servidor
  const [loading, setLoading] = useState(true);    // Cargando estado inicial
  const [accionando, setAccionando] = useState(false); // Ejecutando una acción
  const [resultado, setResultado] = useState(null); // Resultado de la acción
  const [vistaActual, setVistaActual] = useState('menu'); // 'menu' | 'reagendar'

  // Campos del reagendamiento
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaFechaFin, setNuevaFechaFin] = useState('');

  // ── 1. Cargar el estado del token al montar el componente ─────────────────
  const cargarEstado = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/recordatorios/token/${token}`);
      setEstado(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Token inválido o expirado.';
      setEstado({ error: msg });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);

  // ── 2. Si el parámetro accion viene desde el email, pre-seleccionar vista ──
  useEffect(() => {
    if (accionParam === 'REAGENDAR') {
      setVistaActual('reagendar');
    }
  }, [accionParam]);

  // ── 3. Ejecutar acción ────────────────────────────────────────────────────
  const ejecutarAccion = async (accion) => {
    setAccionando(true);
    setResultado(null);
    try {
      let res;
      if (accion === 'REAGENDAR') {
        if (!nuevaFecha || !nuevaFechaFin) {
          setResultado({ tipo: 'error', mensaje: 'Debes seleccionar la nueva fecha de inicio y fin.' });
          setAccionando(false);
          return;
        }
        res = await api.post(`/api/recordatorios/reagendar/${token}`, {
          nuevaFechaInicio: nuevaFecha,
          nuevaFechaFin: nuevaFechaFin,
        });
      } else if (accion === 'CONFIRMAR') {
        res = await api.post(`/api/recordatorios/confirmar/${token}`);
      } else {
        res = await api.post(`/api/recordatorios/cancelar/${token}`);
      }

      setResultado({ tipo: 'success', mensaje: res.data.mensaje, data: res.data });
      // Refrescar estado del servidor
      await cargarEstado();
    } catch (err) {
      const msg = err.response?.data?.error || 'Ocurrió un error al procesar tu solicitud.';
      setResultado({ tipo: 'error', mensaje: msg });
    } finally {
      setAccionando(false);
    }
  };

  // ─── Renders condicionales ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.spinner}>⏳ Verificando enlace...</div>
        </div>
      </div>
    );
  }

  // Token inválido o expirado
  if (estado?.error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>🏥 FisioPlus</div>
          <div style={{ ...styles.alertError, marginTop: '16px' }}>
            <strong>Enlace no disponible</strong>
            <p style={{ margin: '8px 0 0' }}>{estado.error}</p>
          </div>
          <p style={styles.footnote}>
            Si necesitas ayuda, contacta directamente a tu clínica.
          </p>
        </div>
      </div>
    );
  }

  // ── CASO IDEMPOTENTE: la acción ya fue realizada desde otro canal ──────────
  if (estado && !estado.tokenActivo && estado.accionRealizada) {
    const colorMap = {
      CONFIRMADA:  styles.alertSuccess,
      CANCELADA:   styles.alertError,
      REAGENDADA:  styles.alertInfo,
    };
    const iconMap = {
      CONFIRMADA: '✅', CANCELADA: '❌', REAGENDADA: '🔄',
    };
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>🏥 FisioPlus</div>
          <p style={styles.subtitle}>Gestión de Cita</p>
          <div style={colorMap[estado.accionRealizada] || styles.alertInfo}>
            <strong>
              {iconMap[estado.accionRealizada]} Acción ya registrada
            </strong>
            <p style={{ margin: '8px 0 0' }}>
              Tu cita ya fue <strong>{estado.accionRealizada.toLowerCase()}</strong> el{' '}
              {formatFecha(estado.accionRealizadaEn)}{' '}
              {estado.canalAccion ? `desde ${estado.canalAccion}` : ''}.
            </p>
          </div>

          <div style={styles.fechaBox}>
            <p style={styles.fechaText}>
              Estatus actual: <span>{estado.estatusCita}</span>
            </p>
            {estado.accionRealizada === 'REAGENDADA' && estado.nuevaFechaPropuesta && (
              <p style={{ ...styles.fechaText, marginTop: '8px', fontWeight: 'normal' }}>
                Nueva fecha propuesta: {formatFecha(estado.nuevaFechaPropuesta)}
              </p>
            )}
            {estado.fisioDecision && (
              <p style={{ ...styles.fechaText, marginTop: '8px', fontWeight: 'normal' }}>
                Decisión del fisioterapeuta: <strong>{estado.fisioDecision}</strong>
              </p>
            )}
          </div>

          <p style={styles.footnote}>
            Si necesitas realizar cambios adicionales, contacta directamente a tu clínica.
          </p>
        </div>
      </div>
    );
  }

  // ── Resultado de una acción recién ejecutada ───────────────────────────────
  if (resultado) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>🏥 FisioPlus</div>
          <p style={styles.subtitle}>Gestión de Cita</p>

          <div style={resultado.tipo === 'success' ? styles.alertSuccess : styles.alertError}>
            <strong>{resultado.tipo === 'success' ? '✅ ¡Listo!' : '❌ Error'}</strong>
            <p style={{ margin: '8px 0 0' }}>{resultado.mensaje}</p>
            {resultado.data?.estatusCita && (
              <p style={{ margin: '8px 0 0', fontSize: '13px' }}>
                Estatus de tu cita: <strong>{resultado.data.estatusCita}</strong>
              </p>
            )}
          </div>

          {resultado.tipo === 'error' && (
            <button style={{ ...styles.btn, ...styles.btnSecondary }}
                    onClick={() => setResultado(null)}>
              ← Volver
            </button>
          )}
          <p style={styles.footnote}>Puedes cerrar esta ventana.</p>
        </div>
      </div>
    );
  }

  // ── Vista principal: botones de acción ────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🏥 FisioPlus</div>
        <p style={styles.subtitle}>Confirmación de Cita</p>

        {/* Fecha de la cita */}
        <div style={styles.fechaBox}>
          <p style={styles.fechaText}>
            📅 Tu cita: {formatFecha(estado?.fechaInicio)}
          </p>
        </div>

        {/* ── Vista: Menú de opciones ── */}
        {vistaActual === 'menu' && (
          <>
            <p style={{ color: '#475569', marginBottom: '20px' }}>
              Selecciona una acción para tu cita:
            </p>
            <div style={styles.btnGroup}>
              <button
                style={{ ...styles.btn, ...styles.btnConfirmar }}
                onClick={() => ejecutarAccion('CONFIRMAR')}
                disabled={accionando}
              >
                {accionando ? '⏳ Procesando...' : '✅ Confirmar Cita'}
              </button>

              <button
                style={{ ...styles.btn, ...styles.btnReagendar }}
                onClick={() => setVistaActual('reagendar')}
                disabled={accionando}
              >
                🔄 Reagendar Cita
              </button>

              <button
                style={{ ...styles.btn, ...styles.btnCancelar }}
                onClick={() => ejecutarAccion('CANCELAR')}
                disabled={accionando}
              >
                {accionando ? '⏳ Procesando...' : '❌ Cancelar Cita'}
              </button>
            </div>
          </>
        )}

        {/* ── Vista: Formulario de Reagendamiento ── */}
        {vistaActual === 'reagendar' && (
          <>
            <div style={{ ...styles.alertInfo, marginBottom: '20px' }}>
              <strong>🔄 Solicitar nuevo horario</strong>
              <p style={{ margin: '6px 0 0', fontSize: '13px' }}>
                Propón una nueva fecha y hora. El fisioterapeuta recibirá una notificación
                para confirmar el cambio.
              </p>
            </div>

            <label style={styles.label}>Nueva fecha y hora de inicio</label>
            <input
              type="datetime-local"
              style={styles.input}
              value={nuevaFecha}
              onChange={e => setNuevaFecha(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />

            <label style={styles.label}>Fecha y hora de fin</label>
            <input
              type="datetime-local"
              style={styles.input}
              value={nuevaFechaFin}
              onChange={e => setNuevaFechaFin(e.target.value)}
              min={nuevaFecha || new Date().toISOString().slice(0, 16)}
            />

            <div style={{ ...styles.btnGroup, marginTop: '20px' }}>
              <button
                style={{ ...styles.btn, ...styles.btnReagendar }}
                onClick={() => ejecutarAccion('REAGENDAR')}
                disabled={accionando || !nuevaFecha || !nuevaFechaFin}
              >
                {accionando ? '⏳ Enviando solicitud...' : '🔄 Enviar Solicitud de Reagendamiento'}
              </button>
              <button
                style={{ ...styles.btn, ...styles.btnSecondary }}
                onClick={() => setVistaActual('menu')}
                disabled={accionando}
              >
                ← Volver
              </button>
            </div>
          </>
        )}

        <p style={styles.footnote}>
          🔒 Este enlace es de uso único y expira después de la hora de tu cita.
        </p>
      </div>
    </div>
  );
}
