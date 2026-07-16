package com.fisioplus.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "clinicas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Clinica {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(name = "nombre_clinica", nullable = false)
    private String nombreClinica;

    @Column(name = "tipo_registro", nullable = false)
    private String tipoRegistro; // PRUEBA | CONTRATADO

    @Column(nullable = false)
    private String direccion;

    private String telefono;
    private String ciudad;
    private String estado;
    private String pais;

    @Column(name = "pacientes_por_hora", nullable = false)
    private Integer pacientesPorHora;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "updated_by", nullable = false)
    private String updatedBy;

    @Column(nullable = false)
    private String estatus = "ACTIVO";

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (createdBy == null) createdBy = "SYSTEM";
        if (updatedBy == null) updatedBy = "SYSTEM";
        if (estatus == null) estatus = "ACTIVO";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
