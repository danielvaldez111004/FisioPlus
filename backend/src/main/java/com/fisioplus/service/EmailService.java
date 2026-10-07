package com.fisioplus.service;

import com.fisioplus.entity.Cita;
import com.fisioplus.entity.CitaAccionToken;
import com.fisioplus.entity.Fisioterapeuta;
import com.fisioplus.entity.Paciente;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import jakarta.mail.internet.MimeMessage;
import java.time.format.DateTimeFormatter;

/**
 * Servicio de envío de correos electrónicos usando JavaMailSender + Thymeleaf.
 * Gestiona dos tipos de emails: recordatorio al paciente y notificación al fisioterapeuta.
 */
@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender, SpringTemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }

    // ---------------------------------------------------------------
    // Email de recordatorio 24h al paciente
    // ---------------------------------------------------------------

    /**
     * Envía el recordatorio de 24h al paciente con los tres botones de acción.
     *
     * @param paciente   Paciente destinatario.
     * @param cita       Cita próxima.
     * @param urlAccion  URL base del token (el frontend añade el parámetro ?accion=).
     */
    public void enviarRecordatorio(Paciente paciente, Cita cita, String urlAccion) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy 'a las' HH:mm");

        Context ctx = new Context();
        ctx.setVariable("nombre", paciente.getNombre() + " " + paciente.getApellidoPaterno());
        ctx.setVariable("fechaCita", cita.getFechaInicio().format(fmt));
        ctx.setVariable("urlConfirmar", urlAccion + "?accion=CONFIRMAR");
        ctx.setVariable("urlCancelar",  urlAccion + "?accion=CANCELAR");
        ctx.setVariable("urlReagendar", urlAccion + "?accion=REAGENDAR");

        String html = templateEngine.process("email/recordatorio-cita", ctx);
        enviarEmail(
                paciente.getEmail(),
                "📅 Recordatorio de tu cita mañana — FisioPlus",
                html
        );
    }

    // ---------------------------------------------------------------
    // Email de notificación de reagendamiento al fisioterapeuta
    // ---------------------------------------------------------------

    /**
     * Notifica al fisioterapeuta que el paciente solicitó reagendar.
     *
     * @param fisio       Fisioterapeuta destinatario.
     * @param cita        Cita con estatus REAGENDADA.
     * @param token       Token con la nueva fecha propuesta.
     * @param urlDecision URL para que el fisio tome la decisión.
     */
    public void enviarNotificacionFisioReagendamiento(Fisioterapeuta fisio, Cita cita,
                                                       CitaAccionToken token, String urlDecision) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy 'a las' HH:mm");

        Context ctx = new Context();
        ctx.setVariable("fisioNombre", fisio.getNombre() + " " + fisio.getApellidoPaterno());
        ctx.setVariable("citaId", cita.getId());
        ctx.setVariable("nuevaFecha",
                token.getNuevaFechaPropuesta() != null
                        ? token.getNuevaFechaPropuesta().format(fmt)
                        : "Sin especificar");
        ctx.setVariable("urlAceptar",  urlDecision + "?decision=ACEPTADA");
        ctx.setVariable("urlRechazar", urlDecision + "?decision=RECHAZADA");

        String html = templateEngine.process("email/reagendamiento-fisio", ctx);
        enviarEmail(
                fisio.getEmail(),
                "🔄 Solicitud de reagendamiento de cita — FisioPlus",
                html
        );
    }

    // ---------------------------------------------------------------
    // Método utilitario de envío
    // ---------------------------------------------------------------

    private void enviarEmail(String destinatario, String asunto, String html) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, "FisioPlus Clínica");
            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setText(html, true);
            mailSender.send(msg);
            log.info("[Email] Enviado a {} — Asunto: {}", destinatario, asunto);
        } catch (Exception e) {
            throw new RuntimeException("Error enviando email a " + destinatario + ": " + e.getMessage(), e);
        }
    }
}
