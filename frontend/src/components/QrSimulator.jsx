import React, { useState } from 'react';
import { X, QrCode, CheckCircle, LogIn, LogOut, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function QrSimulator({ cita, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=FISIOPLUS-CITA-${cita.id}&bgcolor=ffffff&color=0369a1&margin=10`;

  const doAction = async (action) => {
    setLoading(true);
    setMsg(null);
    setError(null);
    try {
      const { data } = await api.post(`/citas/${cita.id}/${action}`);
      setMsg(data.message);
      onUpdated?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar la acción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <QrCode className="w-5 h-5 text-medical-600" />
            <span>Lector QR — Cita #{cita.id}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Display */}
        <div className="flex flex-col items-center p-6 gap-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
            <img
              src={qrUrl}
              alt={`QR Cita #${cita.id}`}
              className="w-48 h-48 rounded-lg"
            />
          </div>

          <div className="text-center space-y-1 text-sm">
            <p className="font-semibold text-slate-700">{cita.descripcion || `Sesión #${cita.numeroSesion}`}</p>
            <p className="text-slate-400 text-xs">
              {cita.fechaInicio ? new Date(cita.fechaInicio).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
            </p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              cita.estatus === 'PROGRAMADA' ? 'bg-blue-50 text-blue-700' :
              cita.estatus === 'EN_PROCESO' ? 'bg-amber-50 text-amber-700' :
              cita.estatus === 'TERMINADA'  ? 'bg-emerald-50 text-emerald-700' :
              'bg-rose-50 text-rose-700'
            }`}>
              {cita.estatus}
            </span>
          </div>

          {/* Feedback */}
          {msg && (
            <div className="w-full flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{msg}</span>
            </div>
          )}
          {error && (
            <div className="w-full p-3 bg-rose-50 border border-rose-100 rounded-xl text-sm text-rose-700">{error}</div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 grid grid-cols-2 gap-3">
          <button
            disabled={loading || cita.estatus !== 'PROGRAMADA'}
            onClick={() => doAction('check-in')}
            className="btn-primary justify-center disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Check-In
          </button>
          <button
            disabled={loading || cita.estatus !== 'EN_PROCESO'}
            onClick={() => doAction('check-out')}
            className="btn-secondary justify-center disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Check-Out
          </button>
        </div>

        <p className="pb-4 text-center text-[10px] text-slate-300">
          FisioPlus QR Engine · Cita ID: {cita.id}
        </p>
      </div>
    </div>
  );
}
