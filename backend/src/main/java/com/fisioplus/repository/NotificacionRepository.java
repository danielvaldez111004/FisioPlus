package com.fisioplus.repository;

import com.fisioplus.entity.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    /** Historial completo de notificaciones de una cita, ordenado por fecha desc. */
    List<Notificacion> findByCitaIdOrderByCreatedAtDesc(Long citaId);

    /** Notificaciones fallidas para reintento o alerta. */
    List<Notificacion> findByEstatus(String estatus);

    /** Notificaciones por canal para métricas. */
    List<Notificacion> findByCanalAndEstatus(String canal, String estatus);
}
