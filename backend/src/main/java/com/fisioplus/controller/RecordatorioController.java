package com.fisioplus.controller;

import com.fisioplus.entity.Cita;
import com.fisioplus.entity.CitaAccionToken;
import com.fisioplus.repository.CitaAccionTokenRepository;
import com.fisioplus.repository.CitaRepository;
import com.fisioplus.repository.PacienteRepository;
import com.fisioplus.security.JwtFilter;
import com.fisioplus.service.CitaAccionService;
import com.fisioplus.service.RecordatorioService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller REST para el módulo de recordatorios y confirmación de citas.
 *
 * RUTAS PÚBLICAS (sin JWT):
 *   GET  /api/recordatorios/token/{token}       → Estado del token
 *   POST /api/recordatorios/confirmar/{token}   → Confirmar cita
 *   POST /api/recordatorios/cancelar/{token}    → Cancelar cita
 *   POST /api/recordatorios/reagendar/{token}   → Reagendar cita
 *
 * RUTAS AUTENTICADAS (con JWT):
 *   POST /api/recordatorios/decision-fisio/{token}  → Fisioterapeuta acepta/rechaza reagendamiento
 *   GET  /api/recordatorios/toasts                  → Toasts pendientes para el paciente
 *   GET  /api/recordatorios/admin/notificaciones    → Lista notificaciones de la clínica (ADMIN)
 *   POST /api/recordatorios/debug/forzar/{citaId}   → Forzar recordatorio manual (desarrollo)
 */
@RestController
@RequestMapping("/api/recordatorios")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@Slf4j
public class RecordatorioController {

    private final CitaAccionService citaAccionService;
    private final CitaAccionTokenRepository tokenRepository;
    private final CitaRepository citaRepository;
    private final PacienteRepository pacienteRepository;
    private final RecordatorioService recordatorioService;

    public RecordatorioController(CitaAccionService citaAccionService,
                                   CitaAccionTokenRepository tokenRepository,
                                   CitaRepository citaRepository,
                                   PacienteRepository pacienteRepository,
                                   RecordatorioService recordatorioService) {
        this.citaAccionService = citaAccionService;
        this.tokenRepository = tokenRepository;
        this.citaRepository = citaRepository;
        this.pacienteRepository = pacienteRepository;
        this.recordatorioService = recordatorioService;
    }

    // ===================================================================
    // RUTAS PÚBLICAS — Acciones del paciente desde enlace de notificación
    // ===================================================================

    /**
     * GET /api/recordatorios/token/{token}
     *
     * El frontend lo llama SIEMPRE primero al cargar la página de confirmación.
     * Retorna el estado actual del token para que la UI decida qué mostrar:
     *   - tokenActivo = true  → mostrar botones de acción
     *   - tokenActivo = false → mostrar el estado ya ejecutado (idempotencia UI)
     *   - error              → token inválido o expirado
     */
    @GetMapping("/token/{token}")
    public ResponseEntity<?> getEstadoToken(@PathVariable String token) {
        Optional<CitaAccionToken> tokenOpt = tokenRepository.findByToken(token);

        if (tokenOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                    "error", "Token no encontrado. El enlace puede ser inválido."
            ));
        }

        CitaAccionToken t = tokenOpt.get();

        if (t.isExpired()) {
            return ResponseEntity.status(410).body(Map.of(
                    "error", "Este enlace ha expirado.",
                    "expiradoEn", t.getExpiresAt().toString()
            ));
        }

        Cita cita = citaRepository.findById(t.getCitaId()).orElseThrow();

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("citaId", cita.getId());
        respuesta.put("estatusCita", cita.getEstatus());
        respuesta.put("fechaInicio", cita.getFechaInicio().toString());
        respuesta.put("fechaFin", cita.getFechaFin().toString());
        respuesta.put("tokenActivo", t.isAccionPendiente());
        respuesta.put("accionRealizada", t.getAccionRealizada());
        respuesta.put("accionRealizadaEn",
                t.getAccionRealizadaAt() != null ? t.getAccionRealizadaAt().toString() : null);
        respuesta.put("canalAccion", t.getCanalAccion());
        respuesta.put("nuevaFechaPropuesta",
                t.getNuevaFechaPropuesta() != null ? t.getNuevaFechaPropuesta().toString() : null);
        respuesta.put("fisioDecision", t.getFisioDecision());

        return ResponseEntity.ok(respuesta);
    }

    /**
     * POST /api/recordatorios/confirmar/{token}
     * Idempotente — si ya fue confirmada retorna el estado actual sin error.
     */
    @PostMapping("/confirmar/{token}")
    public ResponseEntity<?> confirmarCita(@PathVariable String token) {
        return citaAccionService.procesarAccion(token, "CONFIRMAR", null, null);
    }

    /**
     * POST /api/recordatorios/cancelar/{token}
     * Idempotente — si ya fue cancelada retorna el estado actual sin error.
     */
    @PostMapping("/cancelar/{token}")
    public ResponseEntity<?> cancelarCita(@PathVariable String token) {
        return citaAccionService.procesarAccion(token, "CANCELAR", null, null);
    }

    /**
     * POST /api/recordatorios/reagendar/{token}
     * Body: { "nuevaFechaInicio": "2025-12-01T10:00:00", "nuevaFechaFin": "2025-12-01T11:00:00" }
     * Idempotente — si ya fue reagendada retorna el estado actual sin error.
     */
    @PostMapping("/reagendar/{token}")
    public ResponseEntity<?> reagendarCita(
            @PathVariable String token,
            @RequestBody Map<String, String> body) {

        String nuevaFechaStr    = body.get("nuevaFechaInicio");
        String nuevaFechaFinStr = body.get("nuevaFechaFin");

        if (nuevaFechaStr == null || nuevaFechaStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "El campo 'nuevaFechaInicio' es obligatorio para reagendar."
            ));
        }
        if (nuevaFechaFinStr == null || nuevaFechaFinStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "El campo 'nuevaFechaFin' es obligatorio para reagendar."
            ));
        }

        LocalDateTime nuevaFecha    = LocalDateTime.parse(nuevaFechaStr);
        LocalDateTime nuevaFechaFin = LocalDateTime.parse(nuevaFechaFinStr);

        return citaAccionService.procesarAccion(token, "REAGENDAR", nuevaFecha, nuevaFechaFin);
    }

    // ===================================================================
    // RUTAS AUTENTICADAS — Fisioterapeuta y Admin
    // ===================================================================

    /**
     * POST /api/recordatorios/decision-fisio/{token}
     * Body: { "decision": "ACEPTADA" | "RECHAZADA" }
     * Solo accesible por fisioterapeutas autenticados con JWT.
     */
    @PostMapping("/decision-fisio/{token}")
    public ResponseEntity<?> decisionFisio(
            @PathVariable String token,
            @RequestBody Map<String, String> body) {

        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || !"FISIOTERAPEUTA".equals(user.getRol())) {
            return ResponseEntity.status(403).body(Map.of(
                    "error", "Solo fisioterapeutas autenticados pueden tomar esta decisión."
            ));
        }

        String decision = body.get("decision");
        if (!"ACEPTADA".equals(decision) && !"RECHAZADA".equals(decision)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "'decision' debe ser ACEPTADA o RECHAZADA."
            ));
        }

        return citaAccionService.procesarDecisionFisio(token, decision, user.getUsername());
    }

    /**
     * GET /api/recordatorios/toasts
     * Retorna los tokens con toast pendiente para el paciente autenticado.
     * El frontend llama este endpoint al hacer login para mostrar notificaciones.
     */
    @GetMapping("/toasts")
    public ResponseEntity<?> getToastsPendientes() {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado."));
        }
        if (!"PACIENTE".equals(user.getRol())) {
            return ResponseEntity.status(403).body(Map.of("error", "Solo pacientes pueden ver sus toasts."));
        }

        return pacienteRepository.findByEmail(user.getUsername())
                .map(paciente -> {
                    List<CitaAccionToken> tokens = tokenRepository
                            .findByPacienteIdAndToastGeneradoTrueAndAccionRealizadaIsNull(paciente.getId());

                    List<Map<String, Object>> toasts = tokens.stream().map(t -> {
                        Cita cita = citaRepository.findById(t.getCitaId()).orElse(null);
                        Map<String, Object> toast = new HashMap<>();
                        toast.put("token", t.getToken());
                        toast.put("citaId", t.getCitaId());
                        toast.put("fechaCita", cita != null ? cita.getFechaInicio().toString() : null);
                        toast.put("mensaje", "📅 Tienes una cita mañana. ¿Confirmas tu asistencia?");
                        return toast;
                    }).toList();

                    return ResponseEntity.ok((Object) toasts);
                })
                .orElse(ResponseEntity.status(404).body(Map.of("error", "Perfil de paciente no encontrado.")));
    }

    /**
     * GET /api/recordatorios/admin/notificaciones?citaId={id}
     * Retorna el historial de notificaciones de una cita. Solo para ADMIN y FISIOTERAPEUTA.
     */
    @GetMapping("/admin/notificaciones")
    public ResponseEntity<?> getNotificacionesPorCita(@RequestParam Long citaId) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || "PACIENTE".equals(user.getRol())) {
            return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado."));
        }

        Optional<CitaAccionToken> tokenOpt = tokenRepository.findByCitaIdAndAccionRealizadaIsNull(citaId);
        // Retornar info del token de la cita si existe
        Map<String, Object> resp = new HashMap<>();
        resp.put("citaId", citaId);
        tokenOpt.ifPresent(t -> {
            resp.put("token", t.getToken());
            resp.put("emailEnviado", t.getEmailEnviado());
            resp.put("whatsappEnviado", t.getWhatsappEnviado());
            resp.put("toastGenerado", t.getToastGenerado());
            resp.put("accionRealizada", t.getAccionRealizada());
            resp.put("accionRealizadaEn", t.getAccionRealizadaAt());
            resp.put("fisioDecision", t.getFisioDecision());
        });

        return ResponseEntity.ok(resp);
    }

    /**
     * POST /api/recordatorios/debug/forzar/{citaId}
     * Fuerza el envío del recordatorio para una cita específica.
     * Solo disponible para ADMIN y SUPER_ADMIN. Útil para pruebas en desarrollo.
     */
    @PostMapping("/debug/forzar/{citaId}")
    public ResponseEntity<?> forzarRecordatorio(@PathVariable Long citaId) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || (!user.getRol().equals("ADMIN") && !user.getRol().equals("SUPER_ADMIN"))) {
            return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado. Solo ADMIN."));
        }

        Optional<Cita> citaOpt = citaRepository.findById(citaId);
        if (citaOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Cita no encontrada."));
        }

        try {
            recordatorioService.procesarRecordatorio(citaOpt.get());
            return ResponseEntity.ok(Map.of(
                    "mensaje", "Recordatorio forzado exitosamente para cita " + citaId
            ));
        } catch (Exception e) {
            log.error("[Debug] Error al forzar recordatorio para cita {}: {}", citaId, e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Error al forzar recordatorio: " + e.getMessage()
            ));
        }
    }

    // ---------------------------------------------------------------
    // Helper de autenticación (mismo patrón que CitaController)
    // ---------------------------------------------------------------

    private JwtFilter.CustomUserDetails getAuthenticatedUser() {
        Object details = SecurityContextHolder.getContext().getAuthentication().getDetails();
        if (details instanceof JwtFilter.CustomUserDetails) {
            return (JwtFilter.CustomUserDetails) details;
        }
        return null;
    }
}
