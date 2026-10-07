package com.fisioplus.service;

import com.fisioplus.entity.Cita;
import com.fisioplus.entity.CitaAccionToken;
import com.fisioplus.entity.Paciente;
import com.fisioplus.entity.ServicioContratado;
import com.fisioplus.repository.CitaRepository;
import com.fisioplus.repository.PacienteRepository;
import com.fisioplus.repository.ServicioContratadoRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orquestador del flujo de recordatorio 24h.
 * Recibe una cita del scheduler, obtiene el paciente,
 * genera el token y delega el envío al NotificacionService.
 */
@Service
@Slf4j
public class RecordatorioService {

    private final CitaRepository citaRepository;
    private final ServicioContratadoRepository servicioContratadoRepository;
    private final PacienteRepository pacienteRepository;
    private final TokenService tokenService;
    private final NotificacionService notificacionService;

    public RecordatorioService(CitaRepository citaRepository,
                                ServicioContratadoRepository servicioContratadoRepository,
                                PacienteRepository pacienteRepository,
                                TokenService tokenService,
                                NotificacionService notificacionService) {
        this.citaRepository = citaRepository;
        this.servicioContratadoRepository = servicioContratadoRepository;
        this.pacienteRepository = pacienteRepository;
        this.tokenService = tokenService;
        this.notificacionService = notificacionService;
    }

    /**
     * Procesa el recordatorio para una cita específica.
     * Pasos:
     *  1. Resolver el paciente desde el contrato de servicio.
     *  2. Crear o recuperar el token de acción.
     *  3. Cambiar el estatus de la cita a PENDIENTE_CONFIRMACION.
     *  4. Disparar las notificaciones multi-canal (async).
     *
     * @param cita La cita que necesita recordatorio.
     */
    @Transactional
    public void procesarRecordatorio(Cita cita) {
        log.info("[Recordatorio] Procesando cita id={} | estatus={}", cita.getId(), cita.getEstatus());

        // 1. Obtener paciente desde el contrato de servicio
        ServicioContratado contrato = servicioContratadoRepository
                .findById(cita.getServicioContratadoId())
                .orElseThrow(() -> new RuntimeException(
                        "Contrato no encontrado para cita id=" + cita.getId()));

        Paciente paciente = pacienteRepository
                .findById(contrato.getPacienteId())
                .orElseThrow(() -> new RuntimeException(
                        "Paciente id=" + contrato.getPacienteId() + " no encontrado"));

        // 2. Generar o recuperar token activo (idempotente)
        CitaAccionToken token = tokenService.getOrCreateToken(cita, paciente.getId());

        // 3. Actualizar estatus de la cita a PENDIENTE_CONFIRMACION (solo si sigue PROGRAMADA)
        if ("PROGRAMADA".equals(cita.getEstatus())) {
            cita.setEstatus("PENDIENTE_CONFIRMACION");
            cita.setUpdatedBy("SYSTEM_RECORDATORIO");
            citaRepository.save(cita);
            log.info("[Recordatorio] Cita {} actualizada a PENDIENTE_CONFIRMACION", cita.getId());
        }

        // 4. Enviar notificaciones multi-canal (en thread async, no bloquea el scheduler)
        notificacionService.enviarRecordatorio(cita, paciente, token);

        log.info("[Recordatorio] Cita {} procesada exitosamente. Token: {}", cita.getId(), token.getToken());
    }
}
