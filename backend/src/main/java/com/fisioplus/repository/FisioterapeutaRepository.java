package com.fisioplus.repository;

import com.fisioplus.entity.Fisioterapeuta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FisioterapeutaRepository extends JpaRepository<Fisioterapeuta, Long> {
    List<Fisioterapeuta> findByClinicaId(Long clinicaId);
    Optional<Fisioterapeuta> findByEmail(String email);
}
