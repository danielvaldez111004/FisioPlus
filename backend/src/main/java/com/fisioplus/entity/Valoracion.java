package com.fisioplus.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "valoraciones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Valoracion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "paciente_id", nullable = false)
    private Long pacienteId;

    @Column(name = "fisioterapeuta_id", nullable = false)
    private Long fisioterapeutaId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String diagnostico;

    @Column(name = "tratamiento_indicado", nullable = false, columnDefinition = "TEXT")
    private String tratamientoIndicado;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "fecha_valoracion", nullable = false)
    private LocalDateTime fechaValoracion;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @PrePersist
    protected void onCreate() {
        fechaValoracion = LocalDateTime.now();
        if (createdBy == null) createdBy = "SYSTEM";
    }
}
