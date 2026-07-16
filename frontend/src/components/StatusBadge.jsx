import React from 'react';

const configs = {
  PROGRAMADA:  { label: 'Programada',  className: 'badge-programada',  dot: 'bg-blue-500' },
  EN_PROCESO:  { label: 'En Proceso',  className: 'badge-en-proceso',  dot: 'bg-amber-500' },
  TERMINADA:   { label: 'Terminada',   className: 'badge-terminada',   dot: 'bg-emerald-500' },
  CANCELADA:   { label: 'Cancelada',   className: 'badge-cancelada',   dot: 'bg-rose-500' },
  ACTIVO:      { label: 'Activo',      className: 'badge-activo',      dot: 'bg-emerald-500' },
  INACTIVO:    { label: 'Inactivo',    className: 'badge-inactivo',    dot: 'bg-slate-400' },
};

export default function StatusBadge({ status }) {
  const cfg = configs[status] || { label: status, className: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  return (
    <span className={cfg.className}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
