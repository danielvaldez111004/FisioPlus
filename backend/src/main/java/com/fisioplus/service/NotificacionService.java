package com.fisioplus.service;

import com.fisioplus.entity.Cita;
import com.fisioplus.entity.CitaAccionToken;
import com.fisioplus.entity.Fisioterapeuta;
import com.fisioplus.entity.Paciente;
import com.fisioplus.entity.Notificacion;
import com.fisioplus.repository.CitaAccionTokenRepository;
import com.fisioplus.repository.FisioterapeutaRepository;
import com.fisioplus.repository.NotificacionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Fachada de notificaciones multi-canal (Email, WhatsApp, Toast).
 * Cada canal se invoca en modo @Async para no bloquear el scheduler.
 * Registra cada intento en la tabla notificaciones para auditoría.
 */
@Service
@Slf4j
public class NotificacionService {

    private final EmailService emailService;
    private final WhatsAppService whatsAppService;
    private final CitaAccionTokenRepository tokenRepository;
    private final NotificacionRepository notificacionRepository;
    private final FisioterapeutaRepository fisioterapeutaRepository;

    @Value("${fisioplus.app.base-url}")
    private String baseUrl;

    public NotificacionService(EmailService emailService,
                                WhatsAppService whatsAppService,
                                CitaAccionTokenRepository tokenRepository,
                                NotificacionRepository notificacionRepository,
                                FisioterapeutaRepository fisioterapeutaRepository) {
        this.emailService = emailService;
        this.whatsAppService = whatsAppService;
        this.tokenRepository = tokenRepository;
        this.notificacionRepository = notificacionRepository;
        this.fisioterapeutaRepository = fisioterapeutaRepository;
    }

    /**
     * Envía los recordatorios de 24h al paciente por todos los canales.
     * Se ejecuta en un thread separado (@Async) para no bloquear el scheduler.
     *
     * @param cita     Cita a recordar.
     * @param paciente Paciente destinatario.
     * @param token    Token de acción ya creado (o recuperado).
     */
    @Async
    public void enviarRecordatorio(Cita cita, Paciente paciente, CitaAccionToken token) {
        String urlAccion = baseUrl + "/confirmar-cita/" + token.getToken();

        // 1. Email — solo si no fue enviado previamente
        if (!token.getEmailEnviado()) {
            registrarEnvio(cita, token, "RECORDATORIO_24H", "EMAIL", () -> {
                emailService.enviarRecordatorio(paciente, cita, urlAccion);
                token.setEmailEnviado(true);
            });
        } else {
            log.info("[Notificacion] Email ya enviado para cita {}, se omite.", cita.getId());
        }

        // 2. WhatsApp — solo si no fue enviado previamente
        if (!token.getWhatsappEnviado()) {
            registrarEnvio(cita, token, "RECORDATORIO_24H", "WHATSAPP", () -> {
                whatsAppService.enviarRecordatorio(paciente, cita, urlAccion);
                token.setWhatsappEnviado(true);
            });
        } else {
            log.info("[Notificacion] WhatsApp ya enviado para cita {}, se omite.", cita.getId());
        }

        // 3. Toast — marcar para que aparezca en el próximo login del paciente
        if (!token.getToastGenerado()) {
            token.setToastGenerado(true);
            log.info("[Notificacion] Toast marcado para paciente {} — cita {}",
                    paciente.getId(), cita.getId());
        }

        // Persistir los cambios de flags en el token
        tokenRepository.save(token);
    }

    /**
     * Notifica al fisioterapeuta cuando el paciente solicita un reagendamiento.
     * Se ejecuta en un thread separado (@Async).
     *
     * @param cita  Cita reagendada.
     * @param token Token con la nueva fecha propuesta.
     */
    @Async
    public void notificarFisioterapeutaReagendamiento(Cita cita, CitaAccionToken token) {
        fisioterapeutaRepository.findById(cita.getFisioterapeutaId()).ifPresentOrElse(fisio -> {
            String urlDecision = baseUrl + "/confirmar-cita/" + token.getToken() + "/decision-fisio";

            registrarEnvio(cita, token, "REAGENDAMIENTO_PACIENTE", "EMAIL", () ->
                    emailService.enviarNotificacionFisioReagendamiento(fisio, cita, token, urlDecision));

            registrarEnvio(cita, token, "REAGENDAMIENTO_PACIENTE", "WHATSAPP", () ->
                    whatsAppService.enviarNotificacionFisioReagendamiento(fisio, cita, token, urlDecision));

        }, () -> log.warn("[Notificacion] Fisioterapeuta id={} no encontrado para cita {}",
                cita.getFisioterapeutaId(), cita.getId()));
    }

    // ---------------------------------------------------------------
    // Método utilitario interno: ejecuta un envío y registra el log
    // ---------------------------------------------------------------

    private void registrarEnvio(Cita cita, CitaAccionToken token,
                                 String tipo, String canal, Runnable envio) {
        Notificacion registro = Notificacion.builder()
                .citaId(cita.getId())
                .tokenId(token.getId())
                .tipo(tipo)
                .canal(canal)
                .estatus("PENDIENTE")
                .build();

        try {
            envio.run();
            registro.setEstatus("ENVIADO");
            registro.setEnviadoAt(LocalDateTime.now());
            log.info("[Notificacion] {} {} enviado — cita {}", canal, tipo, cita.getId());
        } catch (Exception e) {
            registro.setEstatus("FALLIDO");
            registro.setErrorDetalle(e.getMessage());
            log.error("[Notificacion] {} {} FALLIDO — cita {} — error: {}",
                    canal, tipo, cita.getId(), e.getMessage());
        } finally {
            notificacionRepository.save(registro);
        }
    }
}
