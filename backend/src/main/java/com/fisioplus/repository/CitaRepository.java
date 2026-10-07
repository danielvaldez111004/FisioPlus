package com.fisioplus.repository;

import com.fisioplus.entity.Cita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CitaRepository extends JpaRepository<Cita, Long> {
    List<Cita> findByClinicaId(Long clinicaId);
    List<Cita> findByFisioterapeutaId(Long fisioterapeutaId);
    List<Cita> findByServicioContratadoId(Long servicioContratadoId);
    List<Cita> findByClinicaIdAndFechaInicioBetween(Long clinicaId, LocalDateTime start, LocalDateTime end);
    List<Cita> findByFisioterapeutaIdAndFechaInicioBetween(Long fisioterapeutaId, LocalDateTime start, LocalDateTime end);

    /** Usado por el scheduler para encontrar citas en la ventana de 24h. */
    List<Cita> findByEstatusAndFechaInicioBetween(String estatus, LocalDateTime inicio, LocalDateTime fin);
}
