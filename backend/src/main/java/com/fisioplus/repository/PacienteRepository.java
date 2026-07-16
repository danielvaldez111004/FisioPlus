package com.fisioplus.repository;

import com.fisioplus.entity.Paciente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PacienteRepository extends JpaRepository<Paciente, Long> {
    List<Paciente> findByClinicaId(Long clinicaId);
    Optional<Paciente> findByEmail(String email);
}
