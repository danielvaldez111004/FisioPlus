package com.fisioplus.controller;

import com.fisioplus.entity.Account;
import com.fisioplus.entity.Cita;
import com.fisioplus.entity.Fisioterapeuta;
import com.fisioplus.entity.Paciente;
import com.fisioplus.entity.Servicio;
import com.fisioplus.entity.ServicioContratado;
import com.fisioplus.repository.AccountRepository;
import com.fisioplus.repository.CitaRepository;
import com.fisioplus.repository.FisioterapeutaRepository;
import com.fisioplus.repository.PacienteRepository;
import com.fisioplus.repository.ServicioContratadoRepository;
import com.fisioplus.repository.ServicioRepository;
import com.fisioplus.security.JwtFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@RestController
@RequestMapping("/api/citas")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class CitaController {

    @Autowired
    private CitaRepository citaRepository;

    @Autowired
    private FisioterapeutaRepository fisioterapeutaRepository;

    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired
    private ServicioContratadoRepository servicioContratadoRepository;

    @Autowired
    private ServicioRepository servicioRepository;

    @Autowired
    private AccountRepository accountRepository;

    private JwtFilter.CustomUserDetails getAuthenticatedUser() {
        Object details = SecurityContextHolder.getContext().getAuthentication().getDetails();
        if (details instanceof JwtFilter.CustomUserDetails) {
            return (JwtFilter.CustomUserDetails) details;
        }
        return null;
    }

    /**
     * Helper to transform a flat JPA Cita entity into a rich projection map
     * containing related object information (e.g. Patient Name, Physiotherapist Name, Service description).
     */
    private Map<String, Object> convertToRichResponse(Cita cita) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", cita.getId());
        map.put("descripcion", cita.getDescripcion());
        map.put("servicioContratadoId", cita.getServicioContratadoId());
        map.put("fisioterapeutaId", cita.getFisioterapeutaId());
        map.put("numeroSesion", cita.getNumeroSesion());
        map.put("fechaProgramacion", cita.getFechaProgramacion());
        map.put("fechaInicio", cita.getFechaInicio());
        map.put("fechaFin", cita.getFechaFin());
        map.put("checkIn", cita.getCheckIn());
        map.put("checkOut", cita.getCheckOut());
        map.put("fechaCierre", cita.getFechaCierre());
        map.put("estatus", cita.getEstatus());
        map.put("tratamientoAplicado", cita.getTratamientoAplicado());
        map.put("observaciones", cita.getObservaciones());
        map.put("indicacionesPrevioCita", cita.getIndicacionesPrevioCita());
        map.put("indicacionesPostCita", cita.getIndicacionesPostCita());
        map.put("fotosEvidencia", cita.getFotosEvidencia());
        map.put("clinicaId", cita.getClinicaId());

        // Default placeholder projections
        map.put("paciente", "Paciente");
        map.put("pacienteId", null);
        map.put("fisioterapeuta", "Fisioterapeuta");
        map.put("servicio", "Servicio");

        // Resolve contract properties (Patient & Service package description)
        if (cita.getServicioContratadoId() != null) {
            Optional<ServicioContratado> contractOpt = servicioContratadoRepository.findById(cita.getServicioContratadoId());
            if (contractOpt.isPresent()) {
                ServicioContratado contract = contractOpt.get();
                map.put("pacienteId", contract.getPacienteId());
                
                // Fetch Patient name
                if (contract.getPacienteId() != null) {
                    Optional<Paciente> patientOpt = pacienteRepository.findById(contract.getPacienteId());
                    if (patientOpt.isPresent()) {
                        Paciente p = patientOpt.get();
                        map.put("paciente", p.getNombre() + " " + p.getApellidoPaterno());
                    }
                }

                // Fetch Service description
                if (contract.getServicioId() != null) {
                    Optional<Servicio> serviceOpt = servicioRepository.findById(contract.getServicioId());
                    if (serviceOpt.isPresent()) {
                        map.put("servicio", serviceOpt.get().getDescripcion());
                    }
                }
            }
        }

        // Fetch Physiotherapist name
        if (cita.getFisioterapeutaId() != null) {
            Optional<Fisioterapeuta> doctorOpt = fisioterapeutaRepository.findById(cita.getFisioterapeutaId());
            if (doctorOpt.isPresent()) {
                Fisioterapeuta d = doctorOpt.get();
                map.put("fisioterapeuta", d.getNombre() + " " + d.getApellidoPaterno());
            }
        }

        return map;
    }

    @GetMapping
    public ResponseEntity<?> getCitas() {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        List<Cita> list;
        if ("SUPER_ADMIN".equals(user.getRol())) {
            list = citaRepository.findAll();
        } else if ("PACIENTE".equals(user.getRol())) {
            // A patient can only view their own appointments
            Optional<Paciente> patientOpt = pacienteRepository.findByEmail(user.getUsername());
            if (patientOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Patient profile not found"));
            }
            List<ServicioContratado> patientContracts = servicioContratadoRepository.findByPacienteId(patientOpt.get().getId());
            List<Long> contractIds = patientContracts.stream().map(ServicioContratado::getId).toList();
            
            // Find all appointments referencing patient contracts
            list = citaRepository.findAll().stream()
                    .filter(cita -> contractIds.contains(cita.getServicioContratadoId()))
                    .toList();
        } else if ("FISIOTERAPEUTA".equals(user.getRol())) {
            // A physiotherapist can only view their own appointments strictly matching their FisioterapeutaId
            Optional<Fisioterapeuta> doctorOpt = fisioterapeutaRepository.findByEmail(user.getUsername());
            if (doctorOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Physiotherapist profile not found"));
            }
            list = citaRepository.findByFisioterapeutaId(doctorOpt.get().getId());
        } else {
            // Clinic Admin views all appointments belonging to their clinic tenant
            list = citaRepository.findByClinicaId(user.getClinicaId());
        }

        List<Map<String, Object>> richList = list.stream()
                .map(this::convertToRichResponse)
                .toList();

        return ResponseEntity.ok(richList);
    }

    @PostMapping
    public ResponseEntity<?> createCita(@RequestBody Cita cita) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        if (cita.getServicioContratadoId() == null || cita.getFisioterapeutaId() == null || cita.getFechaInicio() == null || cita.getFechaFin() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "ServicioContratadoId, FisioterapeutaId, FechaInicio, and FechaFin are required"));
        }

        Optional<ServicioContratado> contractOpt = servicioContratadoRepository.findById(cita.getServicioContratadoId());
        if (contractOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Service contract not found"));
        }

        ServicioContratado contract = contractOpt.get();

        // Multi-tenant check
        if (!"SUPER_ADMIN".equals(user.getRol())) {
            cita.setClinicaId(user.getClinicaId());
        }

        // Automatic session number calculation
        List<Cita> pastSessions = citaRepository.findByServicioContratadoId(contract.getId());
        cita.setNumeroSesion(pastSessions.size() + 1);

        // Resolve correct Fisioterapeuta entity ID to prevent Account ID vs Doctor ID mismatch
        if ("FISIOTERAPEUTA".equals(user.getRol())) {
            Optional<Fisioterapeuta> doctorOpt = fisioterapeutaRepository.findByEmail(user.getUsername());
            if (doctorOpt.isPresent()) {
                cita.setFisioterapeutaId(doctorOpt.get().getId());
            }
        }

        // Standard setup
        cita.setEstatus("PROGRAMADA");
        cita.setFechaProgramacion(LocalDateTime.now());
        cita.setCreatedBy(user.getUsername());
        cita.setUpdatedBy(user.getUsername());

        Cita savedCita = citaRepository.save(cita);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToRichResponse(savedCita));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCita(@PathVariable Long id, @RequestBody Cita details) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Optional<Cita> citaOpt = citaRepository.findById(id);
        if (citaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Appointment not found"));
        }

        Cita appointment = citaOpt.get();

        if (!"SUPER_ADMIN".equals(user.getRol()) && !appointment.getClinicaId().equals(user.getClinicaId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Clinic tenant mismatch."));
        }

        appointment.setDescripcion(details.getDescripcion());
        appointment.setFechaInicio(details.getFechaInicio());
        appointment.setFechaFin(details.getFechaFin());
        appointment.setIndicacionesPrevioCita(details.getIndicacionesPrevioCita());
        appointment.setUpdatedBy(user.getUsername());

        Cita updatedCita = citaRepository.save(appointment);
        return ResponseEntity.ok(convertToRichResponse(updatedCita));
    }

    // --- Sub-resource: LECTOR QR (Check-in / Check-out) ---

    @PostMapping("/{id}/check-in")
    public ResponseEntity<?> checkIn(@PathVariable Long id) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Optional<Cita> citaOpt = citaRepository.findById(id);
        if (citaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Appointment not found"));
        }

        Cita appointment = citaOpt.get();

        if (!"SUPER_ADMIN".equals(user.getRol()) && !appointment.getClinicaId().equals(user.getClinicaId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Clinic tenant mismatch."));
        }

        if (!"PROGRAMADA".equals(appointment.getEstatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only appointments with status PROGRAMADA can perform check-in"));
        }

        appointment.setCheckIn(LocalDateTime.now());
        appointment.setEstatus("EN_PROCESO");
        appointment.setUpdatedBy(user.getUsername());

        Cita updatedCita = citaRepository.save(appointment);
        return ResponseEntity.ok(Map.of(
                "message", "Patient Check-in recorded successfully. Status shifted to EN_PROCESO.",
                "cita", convertToRichResponse(updatedCita)
        ));
    }

    @PostMapping("/{id}/check-out")
    public ResponseEntity<?> checkOut(@PathVariable Long id) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Optional<Cita> citaOpt = citaRepository.findById(id);
        if (citaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Appointment not found"));
        }

        Cita appointment = citaOpt.get();

        if (!"SUPER_ADMIN".equals(user.getRol()) && !appointment.getClinicaId().equals(user.getClinicaId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Clinic tenant mismatch."));
        }

        if (!"EN_PROCESO".equals(appointment.getEstatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only appointments with status EN_PROCESO can perform check-out"));
        }

        appointment.setCheckOut(LocalDateTime.now());
        appointment.setUpdatedBy(user.getUsername());

        Cita updatedCita = citaRepository.save(appointment);
        return ResponseEntity.ok(Map.of(
                "message", "Patient Check-out recorded successfully. Awaiting doctor closure.",
                "cita", convertToRichResponse(updatedCita)
        ));
    }

    // --- Sub-resource: Cierre de Cita (Fisioterapeuta records treatments and notes) ---

    @PostMapping("/{id}/cerrar")
    public ResponseEntity<?> cerrarCita(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || !"FISIOTERAPEUTA".equals(user.getRol())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Only FISIOTERAPEUTA role can perform appointment closures."));
        }

        Optional<Cita> citaOpt = citaRepository.findById(id);
        if (citaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Appointment not found"));
        }

        Cita appointment = citaOpt.get();

        if (!appointment.getClinicaId().equals(user.getClinicaId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Clinic tenant mismatch."));
        }

        String tratamiento = payload.get("tratamientoAplicado");
        String observaciones = payload.get("observaciones");
        String indicacionesPost = payload.get("indicacionesPostCita");
        String fotos = payload.get("fotosEvidencia");

        if (tratamiento == null || tratamiento.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tratamiento Applied is required for closing a session"));
        }

        appointment.setTratamientoAplicado(tratamiento);
        appointment.setObservaciones(observaciones);
        appointment.setIndicacionesPostCita(indicacionesPost);
        appointment.setFotosEvidencia(fotos);
        
        appointment.setFechaCierre(LocalDateTime.now());
        appointment.setEstatus("TERMINADA");
        appointment.setUpdatedBy(user.getUsername());

        Cita closedCita = citaRepository.save(appointment);
        return ResponseEntity.ok(Map.of(
                "message", "Appointment successfully closed and marked as TERMINADA.",
                "cita", convertToRichResponse(closedCita)
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCita(@PathVariable Long id) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || (!"ADMIN".equals(user.getRol()) && !"FISIOTERAPEUTA".equals(user.getRol()) && !"SUPER_ADMIN".equals(user.getRol()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied."));
        }

        Optional<Cita> citaOpt = citaRepository.findById(id);
        if (citaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Appointment not found"));
        }

        Cita appointment = citaOpt.get();

        if (!"SUPER_ADMIN".equals(user.getRol()) && !appointment.getClinicaId().equals(user.getClinicaId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Clinic tenant mismatch."));
        }

        appointment.setEstatus("CANCELADA");
        appointment.setUpdatedBy(user.getUsername());
        citaRepository.save(appointment);

        return ResponseEntity.ok(Map.of("message", "Appointment successfully marked as CANCELADA."));
    }
}
