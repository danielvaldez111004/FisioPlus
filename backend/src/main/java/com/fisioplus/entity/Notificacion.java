package com.fisioplus.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notificaciones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cita_id", nullable = false)
    private Long citaId;

    @Column(name = "token_id")
    private Long tokenId;

    /** Tipo de notificación: RECORDATORIO_24H | REAGENDAMIENTO_PACIENTE | DECISION_FISIO */
    @Column(nullable = false, length = 50)
    private String tipo;

    /** Canal de envío: EMAIL | WHATSAPP | TOAST */
    @Column(nullable = false, length = 20)
    private String canal;

    /** Resultado del intento: ENVIADO | FALLIDO | PENDIENTE */
    @Column(nullable = false, length = 20)
    private String estatus;

    /** Detalle del error si el envío falló. */
    @Column(name = "error_detalle", columnDefinition = "TEXT")
    private String errorDetalle;

    @Column(name = "enviado_at")
    private LocalDateTime enviadoAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
