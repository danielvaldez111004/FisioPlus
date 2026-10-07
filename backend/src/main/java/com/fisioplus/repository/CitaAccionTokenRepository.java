package com.fisioplus.repository;

import com.fisioplus.entity.CitaAccionToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CitaAccionTokenRepository extends JpaRepository<CitaAccionToken, Long> {

    /** Busca un token por su valor UUID hex. */
    Optional<CitaAccionToken> findByToken(String token);

    /**
     * Busca un token activo (sin acción realizada) para una cita.
     * Permite reutilizar el mismo token si el scheduler vuelve a correr.
     */
    Optional<CitaAccionToken> findByCitaIdAndAccionRealizadaIsNull(Long citaId);

    /**
     * Recupera todos los tokens con toast pendiente para un paciente.
     * El paciente aún no realizó ninguna acción → se muestra el Toast al login.
     */
    List<CitaAccionToken> findByPacienteIdAndToastGeneradoTrueAndAccionRealizadaIsNull(Long pacienteId);

    /** Limpieza nocturna: tokens expirados y sin acción, más viejos de una fecha dada. */
    List<CitaAccionToken> findByExpiresAtBeforeAndAccionRealizadaIsNull(LocalDateTime fecha);
}
