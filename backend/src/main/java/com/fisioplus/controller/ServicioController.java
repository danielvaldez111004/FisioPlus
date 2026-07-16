package com.fisioplus.controller;

import com.fisioplus.entity.Servicio;
import com.fisioplus.entity.ServicioContratado;
import com.fisioplus.repository.ServicioContratadoRepository;
import com.fisioplus.repository.ServicioRepository;
import com.fisioplus.security.JwtFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class ServicioController {

    @Autowired
    private ServicioRepository servicioRepository;

    @Autowired
    private ServicioContratadoRepository servicioContratadoRepository;

    private JwtFilter.CustomUserDetails getAuthenticatedUser() {
        Object details = SecurityContextHolder.getContext().getAuthentication().getDetails();
        if (details instanceof JwtFilter.CustomUserDetails) {
            return (JwtFilter.CustomUserDetails) details;
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<?> getServicios() {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        if ("SUPER_ADMIN".equals(user.getRol())) {
            // Super Admin manages the template base services
            return ResponseEntity.ok(servicioRepository.findByEsBaseTrue());
        }

        // Return localized customized services for this clinic tenant AND base catalog templates
        return ResponseEntity.ok(servicioRepository.findByEsBaseTrueOrClinicaId(user.getClinicaId()));
    }

    @PostMapping
    public ResponseEntity<?> createServicio(@RequestBody Servicio servicio) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        if (servicio.getDescripcion() == null || servicio.getCantidadTerapias() == null || servicio.getPrecio() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Descripcion, Cantidad de Terapias, and Precio are required"));
        }

        servicio.setCreatedBy(user.getUsername());
        servicio.setUpdatedBy(user.getUsername());
        servicio.setEstatus("ACTIVO");

        if ("SUPER_ADMIN".equals(user.getRol())) {
            // Base template
            servicio.setEsBase(true);
            servicio.setClinicaId(null);
            servicio.setServicioBaseId(null);
        } else if ("ADMIN".equals(user.getRol())) {
            // Clinic custom
            servicio.setEsBase(false);
            servicio.setClinicaId(user.getClinicaId());
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Admin or Super Admin role required."));
        }

        Servicio savedService = servicioRepository.save(servicio);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedService);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateServicio(@PathVariable Long id, @RequestBody Servicio details) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Optional<Servicio> servicioOpt = servicioRepository.findById(id);
        if (servicioOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Service not found"));
        }

        Servicio servicio = servicioOpt.get();

        // Multi-tenant permissions check
        if ("SUPER_ADMIN".equals(user.getRol())) {
            if (!servicio.getEsBase()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Super Admin can only edit base template services"));
            }
        } else if ("ADMIN".equals(user.getRol())) {
            if (servicio.getEsBase() || !servicio.getClinicaId().equals(user.getClinicaId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Tenant clinic mismatch."));
            }
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied."));
        }

        servicio.setDescripcion(details.getDescripcion());
        servicio.setCantidadTerapias(details.getCantidadTerapias());
        servicio.setPrecio(details.getPrecio());
        servicio.setEstatus(details.getEstatus());
        servicio.setUpdatedBy(user.getUsername());

        Servicio updatedService = servicioRepository.save(servicio);
        return ResponseEntity.ok(updatedService);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteServicio(@PathVariable Long id) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Optional<Servicio> servicioOpt = servicioRepository.findById(id);
        if (servicioOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Service not found"));
        }

        Servicio servicio = servicioOpt.get();

        if ("SUPER_ADMIN".equals(user.getRol())) {
            if (!servicio.getEsBase()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Super Admin can only delete base templates"));
            }
        } else if ("ADMIN".equals(user.getRol())) {
            if (servicio.getEsBase() || !servicio.getClinicaId().equals(user.getClinicaId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Clinic tenant mismatch."));
            }
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied."));
        }

        servicioRepository.delete(servicio);
        return ResponseEntity.ok(Map.of("message", "Service deleted successfully"));
    }

    // --- Sub-resource: SERVICIOS CONTRATADOS (Therapy contracts) ---

    @PostMapping("/contratar")
    public ResponseEntity<?> contratarServicio(@RequestBody ServicioContratado contract) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || (!"ADMIN".equals(user.getRol()) && !"FISIOTERAPEUTA".equals(user.getRol()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Admin or Physiotherapist role required."));
        }

        if (contract.getServicioId() == null || contract.getPacienteId() == null || contract.getFisioterapeutaId() == null || contract.getDiagnostico() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "ServicioId, PacienteId, FisioterapeutaId, and Diagnostico are required"));
        }

        Optional<Servicio> serviceOpt = servicioRepository.findById(contract.getServicioId());
        if (serviceOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Service package template not found"));
        }

        Servicio service = serviceOpt.get();
        
        // Calculate totals dynamically
        if (contract.getCantidadSesiones() == null) {
            contract.setCantidadSesiones(service.getCantidadTerapias());
        }
        
        // Unit cost = total package price / total therapies
        BigDecimal unitPrice = service.getPrecio().divide(new BigDecimal(service.getCantidadTerapias()), 2, BigDecimal.ROUND_HALF_UP);
        contract.setPrecioUnitario(unitPrice);
        
        BigDecimal total = unitPrice.multiply(new BigDecimal(contract.getCantidadSesiones()));
        contract.setTotal(total);
        contract.setCreatedBy(user.getUsername());

        ServicioContratado savedContract = servicioContratadoRepository.save(contract);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedContract);
    }

    @GetMapping("/contratados/{pacienteId}")
    public ResponseEntity<?> getServiciosContratados(@PathVariable Long pacienteId) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        // Return only contracts belonging to the specific patient
        return ResponseEntity.ok(servicioContratadoRepository.findByPacienteId(pacienteId));
    }
}
