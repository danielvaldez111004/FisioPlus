package com.fisioplus.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "citas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cita {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String descripcion;

    @Column(name = "servicio_contratado_id", nullable = false)
    private Long servicioContratadoId;

    @Column(name = "fisioterapeuta_id", nullable = false)
    private Long fisioterapeutaId;

    @Column(name = "numero_sesion", nullable = false)
    private Integer numeroSesion;

    @Column(name = "fecha_programacion", nullable = false)
    private LocalDateTime fechaProgramacion;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDateTime fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDateTime fechaFin;

    @Column(name = "check_in")
    private LocalDateTime checkIn;

    @Column(name = "check_out")
    private LocalDateTime checkOut;

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    @Column(nullable = false)
    private String estatus; // PROGRAMADA | EN_PROCESO | TERMINADA | CANCELADA

    @Column(name = "tratamiento_aplicado", columnDefinition = "TEXT")
    private String tratamientoAplicado;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "indicaciones_previo_cita", columnDefinition = "TEXT")
    private String indicacionesPrevioCita;

    @Column(name = "indicaciones_post_cita", columnDefinition = "TEXT")
    private String indicacionesPostCita;

    @Column(name = "fotos_evidencia", columnDefinition = "TEXT")
    private String fotosEvidencia; // Comma-separated paths/URLs

    @Column(name = "clinica_id", nullable = false)
    private Long clinicaId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "updated_by", nullable = false)
    private String updatedBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (createdBy == null) createdBy = "SYSTEM";
        if (updatedBy == null) updatedBy = "SYSTEM";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
