package com.fisioplus.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "servicios_contratados")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServicioContratado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "servicio_id", nullable = false)
    private Long servicioId;

    @Column(name = "paciente_id", nullable = false)
    private Long pacienteId;

    @Column(name = "fisioterapeuta_id", nullable = false)
    private Long fisioterapeutaId; // Doctor who evaluated and prescribed the service

    @Column(nullable = false, columnDefinition = "TEXT")
    private String diagnostico;

    @Column(name = "cantidad_sesiones", nullable = false)
    private Integer cantidadSesiones;

    @Column(name = "precio_unitario", nullable = false, precision = 10, scale = 2)
    private BigDecimal precioUnitario;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (createdBy == null) createdBy = "SYSTEM";
    }
}
