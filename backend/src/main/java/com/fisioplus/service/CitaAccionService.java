package com.fisioplus.service;

import com.fisioplus.entity.Cita;
import com.fisioplus.entity.CitaAccionToken;
import com.fisioplus.entity.Fisioterapeuta;
import com.fisioplus.repository.CitaAccionTokenRepository;
import com.fisioplus.repository.CitaRepository;
import com.fisioplus.repository.FisioterapeutaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Motor central de idempotencia para las acciones del paciente y el fisioterapeuta.
 *
 * GARANTÍA DE IDEMPOTENCIA:
 *   Si la acción ya fue ejecutada (por cualquier canal — Toast, Email, WhatsApp),
 *   el método retorna el estado actual informando que la acción ya está registrada,
 *   sin volver a modificar la cita ni lanzar errores.
 */
@Service
@Slf4j
public class CitaAccionService {

    private final CitaAccionTokenRepository tokenRepository;
    private final CitaRepository citaRepository;
    private final NotificacionService notificacionService;
    private final FisioterapeutaRepository fisioterapeutaRepository;

    public CitaAccionService(CitaAccionTokenRepository tokenRepository,
                              CitaRepository citaRepository,
                              NotificacionService notificacionService,
                              FisioterapeutaRepository fisioterapeutaRepository) {
        this.tokenRepository = tokenRepository;
        this.citaRepository = citaRepository;
        this.notificacionService = notificacionService;
        this.fisioterapeutaRepository = fisioterapeutaRepository;
    }

    // ---------------------------------------------------------------
    // Acciones del Paciente
    // ---------------------------------------------------------------

    /**
     * Procesa la acción del paciente (CONFIRMAR | CANCELAR | REAGENDAR) de forma idempotente.
     *
     * @param tokenStr        El token UUID hex del enlace.
     * @param accion          La acción solicitada.
     * @param nuevaFecha      Nueva fecha de inicio (solo para REAGENDAR).
     * @param nuevaFechaFin   Nueva fecha de fin (solo para REAGENDAR).
     * @return ResponseEntity con el resultado de la operación.
     */
    @Transactional
    public ResponseEntity<?> procesarAccion(String tokenStr, String accion,
                                             LocalDateTime nuevaFecha,
                                             LocalDateTime nuevaFechaFin) {
        // 1. Buscar token
        Optional<CitaAccionToken> tokenOpt = tokenRepository.findByToken(tokenStr);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Token no encontrado"));
        }

        CitaAccionToken token = tokenOpt.get();

        // 2. Verificar expiración
        if (token.isExpired()) {
            return ResponseEntity.status(410).body(Map.of(
                    "error", "El enlace ha expirado.",
                    "expiradoEn", token.getExpiresAt().toString()
            ));
        }

        // 3. IDEMPOTENCIA — si ya se realizó una acción, responder con el estado actual
        if (!token.isAccionPendiente()) {
            Cita citaActual = citaRepository.findById(token.getCitaId()).orElseThrow();
            return ResponseEntity.ok(Map.of(
                    "idempotente", true,
                    "mensaje", "La acción '" + token.getAccionRealizada() + "' ya fue registrada previamente desde " + token.getCanalAccion() + ".",
                    "accionRealizada", token.getAccionRealizada(),
                    "realizadaEn", token.getAccionRealizadaAt().toString(),
                    "canal", token.getCanalAccion(),
                    "estatusCita", citaActual.getEstatus()
            ));
        }

        // 4. Obtener cita
        Cita cita = citaRepository.findById(token.getCitaId())
                .orElseThrow(() -> new RuntimeException("Cita id=" + token.getCitaId() + " no encontrada"));

        // 5. Aplicar la acción según el tipo
        return switch (accion) {
            case "CONFIRMAR" -> confirmar(cita, token);
            case "CANCELAR"  -> cancelar(cita, token);
            case "REAGENDAR" -> reagendar(cita, token, nuevaFecha, nuevaFechaFin);
            default -> ResponseEntity.badRequest().body(Map.of("error", "Acción desconocida: " + accion));
        };
    }

    // ---------------------------------------------------------------
    // Decisión del Fisioterapeuta sobre un reagendamiento
    // ---------------------------------------------------------------

    /**
     * Procesa la decisión del fisioterapeuta (ACEPTADA | RECHAZADA) de forma idempotente.
     *
     * @param tokenStr    El token UUID hex del enlace.
     * @param decision    ACEPTADA o RECHAZADA.
     * @param fisioEmail  Email del fisioterapeuta autenticado (para auditoría).
     * @return ResponseEntity con el resultado de la operación.
     */
    @Transactional
    public ResponseEntity<?> procesarDecisionFisio(String tokenStr, String decision, String fisioEmail) {
        Optional<CitaAccionToken> tokenOpt = tokenRepository.findByToken(tokenStr);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Token no encontrado"));
        }

        CitaAccionToken token = tokenOpt.get();

        // Verificar que el token corresponde a un reagendamiento
        if (!"REAGENDADA".equals(token.getAccionRealizada())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Este token no corresponde a un reagendamiento pendiente de decisión."
            ));
        }

        // IDEMPOTENCIA — el fisio ya tomó una decisión
        if (token.getFisioDecision() != null) {
            return ResponseEntity.ok(Map.of(
                    "idempotente", true,
                    "mensaje", "Ya tomaste una decisión: " + token.getFisioDecision(),
                    "decision", token.getFisioDecision(),
                    "tomadaEn", token.getFisioDecisionAt().toString()
            ));
        }

        Cita cita = citaRepository.findById(token.getCitaId()).orElseThrow();

        if ("ACEPTADA".equals(decision)) {
            // Actualizar fechas de la cita con las propuestas por el paciente
            cita.setFechaInicio(token.getNuevaFechaPropuesta());
            cita.setFechaFin(token.getNuevaFechaFinPropuesta());
            cita.setEstatus("PROGRAMADA");
            cita.setUpdatedBy(fisioEmail);
            citaRepository.save(cita);
            log.info("[DecisionFisio] Cita {} ACEPTADA por {}. Nueva fecha: {}",
                    cita.getId(), fisioEmail, token.getNuevaFechaPropuesta());
        } else {
            // El fisio rechazó → cita queda CANCELADA
            cita.setEstatus("CANCELADA");
            cita.setUpdatedBy(fisioEmail);
            citaRepository.save(cita);
            log.info("[DecisionFisio] Cita {} RECHAZADA (CANCELADA) por {}", cita.getId(), fisioEmail);
        }

        token.setFisioDecision(decision);
        token.setFisioDecisionAt(LocalDateTime.now());
        tokenRepository.save(token);

        return ResponseEntity.ok(Map.of(
                "mensaje", "ACEPTADA".equals(decision)
                        ? "✅ Fecha de reagendamiento aceptada. La cita ha sido reprogramada."
                        : "❌ Reagendamiento rechazado. La cita ha sido cancelada.",
                "decision", decision,
                "estatusCita", cita.getEstatus()
        ));
    }

    // ---------------------------------------------------------------
    // Métodos privados de acción
    // ---------------------------------------------------------------

    private ResponseEntity<?> confirmar(Cita cita, CitaAccionToken token) {
        cita.setEstatus("CONFIRMADA");
        cita.setUpdatedBy("PACIENTE_TOKEN");
        citaRepository.save(cita);

        marcarAccionRealizada(token, "CONFIRMADA");

        log.info("[Accion] Cita {} CONFIRMADA via token {}", cita.getId(), token.getToken());
        return ResponseEntity.ok(Map.of(
                "mensaje", "✅ Tu cita ha sido confirmada exitosamente.",
                "estatusCita", "CONFIRMADA"
        ));
    }

    private ResponseEntity<?> cancelar(Cita cita, CitaAccionToken token) {
        cita.setEstatus("CANCELADA");
        cita.setUpdatedBy("PACIENTE_TOKEN");
        citaRepository.save(cita);

        marcarAccionRealizada(token, "CANCELADA");

        log.info("[Accion] Cita {} CANCELADA via token {}", cita.getId(), token.getToken());
        return ResponseEntity.ok(Map.of(
                "mensaje", "❌ Tu cita ha sido cancelada.",
                "estatusCita", "CANCELADA"
        ));
    }

    private ResponseEntity<?> reagendar(Cita cita, CitaAccionToken token,
                                         LocalDateTime nuevaFecha, LocalDateTime nuevaFechaFin) {
        if (nuevaFecha == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "nuevaFechaInicio es requerida para reagendar."
            ));
        }
        if (nuevaFechaFin == null || !nuevaFechaFin.isAfter(nuevaFecha)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "nuevaFechaFin debe ser posterior a nuevaFechaInicio."
            ));
        }

        // Guardar la propuesta en el token antes de marcar la acción
        token.setNuevaFechaPropuesta(nuevaFecha);
        token.setNuevaFechaFinPropuesta(nuevaFechaFin);

        cita.setEstatus("REAGENDADA");
        cita.setUpdatedBy("PACIENTE_TOKEN");
        citaRepository.save(cita);

        marcarAccionRealizada(token, "REAGENDADA");

        // Notificar al fisioterapeuta (async)
        notificacionService.notificarFisioterapeutaReagendamiento(cita, token);

        log.info("[Accion] Cita {} REAGENDADA via token {} → nueva fecha: {}",
                cita.getId(), token.getToken(), nuevaFecha);

        Map<String, Object> resp = new HashMap<>();
        resp.put("mensaje", "🔄 Solicitud de reagendamiento enviada. El fisioterapeuta confirmará la nueva fecha en breve.");
        resp.put("estatusCita", "REAGENDADA");
        resp.put("nuevaFechaPropuesta", nuevaFecha.toString());
        return ResponseEntity.ok(resp);
    }

    private void marcarAccionRealizada(CitaAccionToken token, String accion) {
        token.setAccionRealizada(accion);
        token.setAccionRealizadaAt(LocalDateTime.now());
        token.setCanalAccion("WEB");
        tokenRepository.save(token);
    }
}
