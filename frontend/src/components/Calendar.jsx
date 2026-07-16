import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const STATUS_COLORS = {
  PROGRAMADA: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
  EN_PROCESO: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  TERMINADA: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
  CANCELADA: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
};

export default function Calendar({
  events = [],
  selectable = false,
  onDateSelect,
  onEventClick,
  initialView = 'timeGridWeek',
  height = '650px',
}) {
  // Map our app events to FullCalendar event format
  const formattedEvents = events.map((event) => {
    const status = event.estatus || 'PROGRAMADA';
    const colors = STATUS_COLORS[status] || STATUS_COLORS.PROGRAMADA;
    
    // Determine the title to show
    let title = event.paciente || event.title || event.descripcion || 'Sin título';
    if (event.numeroSesion) {
      title = `[S${event.numeroSesion}] ${title}`;
    }

    return {
      id: String(event.id),
      title: title,
      start: event.fechaInicio || event.start,
      end: event.fechaFin || event.end,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: { ...event },
    };
  });

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 animate-fadeIn">
      <style>{`
        .fc {
          font-family: inherit;
        }
        .fc .fc-toolbar-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #1e293b;
        }
        .fc .fc-button-primary {
          background-color: #ffffff;
          border-color: #e2e8f0;
          color: #475569;
          font-weight: 600;
          text-transform: capitalize;
          padding: 0.4rem 0.8rem;
          font-size: 0.825rem;
          border-radius: 0.5rem;
          transition: all 0.15s;
        }
        .fc .fc-button-primary:hover {
          background-color: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .fc .fc-button-primary:disabled {
          background-color: #f1f5f9;
          color: #94a3b8;
          border-color: #e2e8f0;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #0f6e56;
          border-color: #0f6e56;
          color: #ffffff;
        }
        .fc .fc-button-group > .fc-button {
          border-radius: 0.5rem;
          margin: 0 1px;
        }
        .fc .fc-col-header-cell-cushion {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          text-decoration: none;
          padding: 6px 4px;
        }
        .fc .fc-timegrid-slot-label-cushion {
          font-size: 0.725rem;
          color: #94a3b8;
          font-weight: 500;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: #f1f5f9;
        }
        .fc .fc-event {
          border-radius: 0.375rem;
          padding: 3px 6px;
          cursor: pointer;
          transition: transform 0.1s, box-shadow 0.15s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          border-width: 1.5px;
        }
        .fc .fc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .fc .fc-event-title {
          font-weight: 600;
          font-size: 0.75rem;
        }
        .fc-v-event .fc-event-main {
          color: inherit;
        }
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={formattedEvents}
        selectable={selectable}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        slotMinTime="07:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
        locale="es"
        height={height}
        select={onDateSelect}
        eventClick={(clickInfo) => {
          if (onEventClick) {
            onEventClick(clickInfo.event.extendedProps);
          }
        }}
        buttonText={{
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
        }}
      />
    </div>
  );
}
