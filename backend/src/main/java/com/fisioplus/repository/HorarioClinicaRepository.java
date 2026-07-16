package com.fisioplus.repository;

import com.fisioplus.entity.HorarioClinica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface HorarioClinicaRepository extends JpaRepository<HorarioClinica, Long> {
    List<HorarioClinica> findByClinicaId(Long clinicaId);
}
