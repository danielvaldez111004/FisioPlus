package com.fisioplus.repository;

import com.fisioplus.entity.Servicio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ServicioRepository extends JpaRepository<Servicio, Long> {
    List<Servicio> findByEsBaseTrue();
    List<Servicio> findByClinicaId(Long clinicaId);
    List<Servicio> findByEsBaseTrueOrClinicaId(Long clinicaId);
    List<Servicio> findByClinicaIdAndEstatus(Long clinicaId, String estatus);
}
