package com.fisioplus.entity;

import com.fisioplus.enums.DiaSemana;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "horario_clinica")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HorarioClinica {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Column(name = "clinica_id", nullable = false)
	private Long clinicaId;

	@Enumerated(EnumType.STRING)
	@Column(name = "dia_semana", nullable = false)
	private DiaSemana diaSemana;
	
	@Column(name = "apertura", nullable = false)
    private LocalTime apertura;

    @Column(name = "cierre", nullable = false)
    private LocalTime cierre;

    @Column(name = "cerrado")
    private Boolean cerrado = false;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @PreUpdate
    protected void onUpdate() {
        fechaActualizacion = LocalDateTime.now();
    }
}
