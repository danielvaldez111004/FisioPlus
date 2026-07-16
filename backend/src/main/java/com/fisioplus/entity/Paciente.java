package com.fisioplus.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pacientes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Paciente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "apellido_paterno", nullable = false)
    private String apellidoPaterno;

    @Column(name = "apellido_materno")
    private String apellidoMaterno;

    @Column(nullable = false)
    private String genero; // MASCULINO | FEMENINO | OTRO

    @Column(name = "estado_civil")
    private String estadoCivil; // SOLTERO | CASADO | DIVORCIADO | VIUDO | UNION_LIBRE

    private String ocupacion;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String telefono;

    private String direccion;
    private String ciudad;
    private String estado;

    @Column(name = "motivo_consulta", nullable = false, columnDefinition = "TEXT")
    private String motivoConsulta;

    @Column(name = "estudios_imagen")
    private String estudiosImagen;

    @Column(name = "practica_deporte", nullable = false)
    private Boolean practicaDeporte;

    @Column(name = "deporte_practicado")
    private String deportePracticado;

    @Column(name = "padece_diabetes", nullable = false)
    private Boolean padeceDiabetes;

    @Column(name = "padece_hipertension", nullable = false)
    private Boolean padeceHipertension;

    @Column(name = "otros_padecimientos", columnDefinition = "TEXT")
    private String otrosPadecimientos;

    @Column(name = "medico_tratante")
    private String medicoTratante;

    @Column(nullable = false)
    private String alias;

    @Column(name = "clinica_id", nullable = false)
    private Long clinicaId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private String estatus = "ACTIVO";

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (estatus == null) estatus = "ACTIVO";
    }
}
