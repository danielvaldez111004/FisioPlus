package com.fisioplus.service;

import com.fisioplus.entity.Cita;
import com.fisioplus.entity.CitaAccionToken;
import com.fisioplus.entity.Fisioterapeuta;
import com.fisioplus.entity.Paciente;
import it.auties.whatsapp.api.Whatsapp;
import it.auties.whatsapp.model.contact.ContactJid;
import it.auties.whatsapp.model.message.standard.TextMessage;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;


import it.auties.whatsapp.api.Whatsapp;
import it.auties.whatsapp.listener.Listener;
import it.auties.whatsapp.model.contact.ContactJid;

/**
 * Servicio de envío de mensajes WhatsApp usando WhatsappWeb4j.
 *
 * PRIMER ARRANQUE:
 *   Al iniciar la aplicación con fisioplus.whatsapp.enabled=true, aparecerá
 *   un QR en la consola del servidor. Escanéalo desde WhatsApp en tu teléfono
 *   (Ajustes → Dispositivos vinculados → Vincular un dispositivo).
 *   La sesión se persiste en disco y no pedirá QR en reinicios posteriores.
 *
 * PRODUCCIÓN:
 *   Para volumen alto (>100 mensajes/día), considera migrar a la
 *   API oficial de WhatsApp Business (Meta Cloud API).
 */
@Service
@Slf4j
public class WhatsAppService {

    @Value("${fisioplus.whatsapp.enabled:false}")
    private boolean enabled;

    @Value("${fisioplus.whatsapp.bot-number:521XXXXXXXXXX}")
    private String botNumber;

    private Whatsapp api;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy 'a las' HH:mm");

    @PostConstruct
    public void init() {
        if (!enabled) return;
        try {
            this.api = Whatsapp.webBuilder()
                .lastConnection()
                .build()
                .addLoggedInListener(() -> log.info("[WhatsApp] Sesión iniciada correctamente"))
                .addDisconnectedListener(reason -> log.warn("[WhatsApp] Desconectado del servicio"))
                .connect()
                .join();
        } catch (Exception e) {
            log.error("[WhatsApp] Error al inicializar cliente de WhatsApp: {}", e.getMessage());
        }
    }

    // ---------------------------------------------------------------
    // Recordatorio 24h al paciente
    // ---------------------------------------------------------------

    public void enviarRecordatorio(Paciente paciente, Cita cita, String urlAccion) {
        if (!puedeEnviar()) return;

        String mensaje = String.format("""
                🏥 *FisioPlus — Recordatorio de Cita*

                Hola %s 👋

                Te recordamos que tienes una cita programada para *mañana %s*.

                Por favor, confirma tu asistencia:

                ✅ Confirmar → %s?accion=CONFIRMAR
                ❌ Cancelar  → %s?accion=CANCELAR
                🔄 Reagendar → %s?accion=REAGENDAR

                _Este enlace es válido hasta la hora de tu cita._
                """,
                paciente.getNombre() + " " + paciente.getApellidoPaterno(),
                cita.getFechaInicio().format(FMT),
                urlAccion, urlAccion, urlAccion
        );

        enviarMensaje(limpiarTelefono(paciente.getTelefono()), mensaje);
    }

    // ---------------------------------------------------------------
    // Notificación de reagendamiento al fisioterapeuta
    // ---------------------------------------------------------------

    public void enviarNotificacionFisioReagendamiento(Fisioterapeuta fisio, Cita cita,
                                                       CitaAccionToken token, String urlDecision) {
        if (!puedeEnviar()) return;

        String nuevaFecha = token.getNuevaFechaPropuesta() != null
                ? token.getNuevaFechaPropuesta().format(FMT)
                : "Sin especificar";

        String mensaje = String.format("""
                🏥 *FisioPlus — Solicitud de Reagendamiento*

                Hola %s 👋

                El paciente de la cita #%d ha solicitado cambiar la fecha a:
                📅 *%s*

                Por favor, toma una decisión:

                ✅ Aceptar nueva fecha  → %s?decision=ACEPTADA
                ❌ Rechazar (cancelar) → %s?decision=RECHAZADA
                """,
                fisio.getNombre() + " " + fisio.getApellidoPaterno(),
                cita.getId(),
                nuevaFecha,
                urlDecision, urlDecision
        );

        if (fisio.getTelefono() != null && !fisio.getTelefono().isBlank()) {
            enviarMensaje(limpiarTelefono(fisio.getTelefono()), mensaje);
        } else {
            log.warn("[WhatsApp] Fisioterapeuta id={} no tiene teléfono registrado.", fisio.getId());
        }
    }

    // ---------------------------------------------------------------
    // Utilidades privadas
    // ---------------------------------------------------------------

    private void enviarMensaje(String telefono, String texto) {
        try {
            ContactJid jid = ContactJid.of(telefono + "@s.whatsapp.net");
            api.sendMessage(jid, TextMessage.of(texto))
                    .thenAccept(r -> log.info("[WhatsApp] Mensaje enviado a {}", telefono))
                    .exceptionally(e -> {
                        log.error("[WhatsApp] Error enviando a {}: {}", telefono, e.getMessage());
                        return null;
                    });
        } catch (Exception e) {
            throw new RuntimeException("Error enviando WhatsApp a " + telefono + ": " + e.getMessage(), e);
        }
    }

    private boolean puedeEnviar() {
        if (!enabled || api == null) {
            log.warn("[WhatsApp] Servicio no disponible (habilitado={}, api={})", enabled, api != null);
            return false;
        }
        return true;
    }

    /**
     * Limpia el número de teléfono dejando solo dígitos.
     * Asegúrate de que los pacientes tengan guardado el código de país (52 para México).
     */
    private String limpiarTelefono(String telefono) {
        if (telefono == null) return botNumber; // fallback
        return telefono.replaceAll("[^0-9]", "");
    }
}
