package com.fisioplus.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "cita_accion_tokens",
        indexes = @Index(name = "idx_cat_token", columnList = "token", unique = true))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CitaAccionToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** UUID hex de 32 caracteres (sin guiones). Entropía 2^128. */
    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(name = "cita_id", nullable = false)
    private Long citaId;

    @Column(name = "paciente_id", nullable = false)
    private Long pacienteId;

    /**
     * Acción ejecutada por el paciente: CONFIRMADA | CANCELADA | REAGENDADA.
     * null mientras no se haya realizado ninguna acción (estado PENDIENTE).
     */
    @Column(name = "accion_realizada")
    private String accionRealizada;

    @Column(name = "accion_realizada_at")
    private LocalDateTime accionRealizadaAt;

    /** Canal desde el que se ejecutó la acción: TOAST | EMAIL | WHATSAPP | WEB */
    @Column(name = "canal_accion", length = 20)
    private String canalAccion;

    /** Momento en que el token deja de ser válido. */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** Control de envíos por canal — evita reenvíos duplicados. */
    @Column(name = "email_enviado", nullable = false)
    private Boolean emailEnviado = false;

    @Column(name = "whatsapp_enviado", nullable = false)
    private Boolean whatsappEnviado = false;

    @Column(name = "toast_generado", nullable = false)
    private Boolean toastGenerado = false;

    /** Nueva fecha propuesta por el paciente al elegir reagendar. */
    @Column(name = "nueva_fecha_propuesta")
    private LocalDateTime nuevaFechaPropuesta;

    @Column(name = "nueva_fecha_fin_propuesta")
    private LocalDateTime nuevaFechaFinPropuesta;

    /**
     * Decisión del fisioterapeuta ante un reagendamiento:
     * ACEPTADA | RECHAZADA | null (pendiente).
     */
    @Column(name = "fisio_decision", length = 20)
    private String fisioDecision;

    @Column(name = "fisio_decision_at")
    private LocalDateTime fisioDecisionAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /** @return true si el token ya superó su fecha de expiración. */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    /** @return true si el paciente aún no ha realizado ninguna acción. */
    public boolean isAccionPendiente() {
        return accionRealizada == null;
    }
}
