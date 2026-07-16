package com.fisioplus.repository;

import com.fisioplus.entity.ServicioContratado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ServicioContratadoRepository extends JpaRepository<ServicioContratado, Long> {
    List<ServicioContratado> findByPacienteId(Long pacienteId);
    List<ServicioContratado> findByFisioterapeutaId(Long fisioterapeutaId);
}
