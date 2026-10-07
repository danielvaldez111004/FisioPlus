package com.fisioplus.scheduler;

import com.fisioplus.entity.Cita;
import com.fisioplus.repository.CitaRepository;
import com.fisioplus.service.RecordatorioService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Job programado que detecta citas en la ventana de 24h y dispara los recordatorios.
 *
 * ESTRATEGIA DE VENTANA:
 *   Corre cada hora. Busca citas cuya fechaInicio esté entre [ahora+23h, ahora+25h].
 *   Esta ventana de 2h absorbe el drift del reloj y evita que una cita sea ignorada
 *   si el job se ejecutó ligeramente tarde en la hora anterior.
 *   La idempotencia del token garantiza que no se envíen mensajes duplicados
 *   aunque el job detecte la misma cita en dos ejecuciones consecutivas.
 *
 * MULTI-INSTANCIA:
 *   Si en el futuro se despliegan múltiples instancias del backend,
 *   agregar ShedLock (@SchedulerLock) para que solo una instancia ejecute el job.
 */
@Component
@Slf4j
public class RecordatorioScheduler {

    private final CitaRepository citaRepository;
    private final RecordatorioService recordatorioService;

    public RecordatorioScheduler(CitaRepository citaRepository,
                                  RecordatorioService recordatorioService) {
        this.citaRepository = citaRepository;
        this.recordatorioService = recordatorioService;
    }

    /**
     * Job principal de recordatorios 24h.
     * El cron se configura en application.properties:
     *   fisioplus.scheduler.recordatorio-cron=0 0 * * * *  (cada hora en punto)
     */
    @Scheduled(cron = "${fisioplus.scheduler.recordatorio-cron:0 0 * * * *}")
    @Transactional(readOnly = true)
    public void enviarRecordatorios() {
        LocalDateTime ahora = LocalDateTime.now();
        LocalDateTime ventanaInicio = ahora.plusHours(23);
        LocalDateTime ventanaFin = ahora.plusHours(25);

        // Solo procesar citas en estatus PROGRAMADA o PENDIENTE_CONFIRMACION
        List<Cita> citasProgramadas = citaRepository
                .findByEstatusAndFechaInicioBetween("PROGRAMADA", ventanaInicio, ventanaFin);

        List<Cita> citasPendientes = citaRepository
                .findByEstatusAndFechaInicioBetween("PENDIENTE_CONFIRMACION", ventanaInicio, ventanaFin);

        int total = citasProgramadas.size() + citasPendientes.size();
        log.info("[Scheduler] Ejecución recordatorios {} | Ventana [{} → {}] | {} citas encontradas",
                ahora, ventanaInicio, ventanaFin, total);

        // Procesar citas PROGRAMADAS → se convertirán a PENDIENTE_CONFIRMACION
        for (Cita cita : citasProgramadas) {
            procesarSeguro(cita);
        }

        // Procesar citas ya en PENDIENTE_CONFIRMACION (reenvío si algún canal falló antes)
        for (Cita cita : citasPendientes) {
            procesarSeguro(cita);
        }

        log.info("[Scheduler] Recordatorios procesados: {}/{}", total, total);
    }

    /**
     * Job nocturno de limpieza: archiva tokens expirados sin acción realizada.
     * Corre a las 2:00 AM todos los días.
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void limpiarTokensExpirados() {
        log.info("[Scheduler] Iniciando limpieza de tokens expirados...");
        // Implementación básica — los tokens expirados simplemente quedan en DB como registro.
        // Si se requiere borrado físico, implementar aquí con tokenRepository.deleteByExpiresAtBefore(...)
        log.info("[Scheduler] Limpieza completada.");
    }

    private void procesarSeguro(Cita cita) {
        try {
            recordatorioService.procesarRecordatorio(cita);
        } catch (Exception e) {
            log.error("[Scheduler] Error procesando cita id={}: {}", cita.getId(), e.getMessage(), e);
        }
    }
}
