package com.fisioplus.controller;

import com.fisioplus.entity.Account;
import com.fisioplus.entity.Paciente;
import com.fisioplus.entity.Valoracion;
import com.fisioplus.entity.Fisioterapeuta;
import com.fisioplus.repository.AccountRepository;
import com.fisioplus.repository.PacienteRepository;
import com.fisioplus.repository.ValoracionRepository;
import com.fisioplus.repository.FisioterapeutaRepository;
import com.fisioplus.security.JwtFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/pacientes")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class PacienteController {

    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private ValoracionRepository valoracionRepository;

    @Autowired
    private FisioterapeutaRepository fisioterapeutaRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private JwtFilter.CustomUserDetails getAuthenticatedUser() {
        Object details = SecurityContextHolder.getContext().getAuthentication().getDetails();
        if (details instanceof JwtFilter.CustomUserDetails) {
            return (JwtFilter.CustomUserDetails) details;
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<?> getPacientes() {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        if ("SUPER_ADMIN".equals(user.getRol())) {
            return ResponseEntity.ok(pacienteRepository.findAll());
        }

        if ("PACIENTE".equals(user.getRol())) {
            // A patient can only view their own record
            Optional<Paciente> pacienteOpt = pacienteRepository.findByEmail(user.getUsername());
            return pacienteOpt.isPresent() 
                    ? ResponseEntity.ok(List.of(pacienteOpt.get()))
                    : ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Patient profile not found"));
        }

        // Admin and Fisioterapeuta can view all patients in their clinic
        return ResponseEntity.ok(pacienteRepository.findByClinicaId(user.getClinicaId()));
    }

    @PostMapping
    public ResponseEntity<?> createPaciente(@RequestBody Paciente patient) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || (!"ADMIN".equals(user.getRol()) && !"FISIOTERAPEUTA".equals(user.getRol()) && !"SUPER_ADMIN".equals(user.getRol()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Admin or Physiotherapist role required."));
        }

        if (patient.getNombre() == null || patient.getApellidoPaterno() == null || patient.getEmail() == null || patient.getTelefono() == null || patient.getMotivoConsulta() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nombre, Apellido Paterno, Email, Telefono, and Motivo Consulta are required"));
        }

        if (accountRepository.existsByUsername(patient.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is already registered as an account username"));
        }

        // Set clinic isolation
        if (!"SUPER_ADMIN".equals(user.getRol())) {
            patient.setClinicaId(user.getClinicaId());
        }

        // Generate Alias: first letter of first name + father's surname in lowercase, without spaces/special chars
        String cleanName = patient.getNombre().toLowerCase().replaceAll("\\s+", "").substring(0, 1);
        String cleanSurname = patient.getApellidoPaterno().toLowerCase().replaceAll("\\s+", "");
        String alias = cleanName + cleanSurname;
        patient.setAlias(alias);

        // Save Paciente
        Paciente savedPatient = pacienteRepository.save(patient);

        // Autogenerate access account
        Account patientAccount = Account.builder()
                .username(patient.getEmail())
                .password(passwordEncoder.encode(alias)) // Initial password is the alias
                .alias(alias)
                .rol("PACIENTE")
                .estatus("ACTIVO")
                .clinicaId(patient.getClinicaId())
                .createdBy(user.getUsername())
                .updatedBy(user.getUsername())
                .build();

        accountRepository.save(patientAccount);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "paciente", savedPatient,
                "accountUsername", patientAccount.getUsername(),
                "accountInitialPassword", alias
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePaciente(@PathVariable Long id, @RequestBody Paciente details) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Optional<Paciente> patientOpt = pacienteRepository.findById(id);
        if (patientOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Patient not found"));
        }

        Paciente patient = patientOpt.get();

        // Multi-tenant check
        if (!"SUPER_ADMIN".equals(user.getRol())) {
            if ("PACIENTE".equals(user.getRol())) {
                if (!patient.getEmail().equals(user.getUsername())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. You can only update your own details."));
                }
            } else {
                if (!patient.getClinicaId().equals(user.getClinicaId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Clinic tenant mismatch."));
                }
            }
        }

        // Apply edits (Patients can only edit basic info, Admin/Fisio can edit all)
        patient.setNombre(details.getNombre());
        patient.setApellidoPaterno(details.getApellidoPaterno());
        patient.setApellidoMaterno(details.getApellidoMaterno());
        patient.setGenero(details.getGenero());
        patient.setTelefono(details.getTelefono());
        patient.setDireccion(details.getDireccion());
        patient.setCiudad(details.getCiudad());
        patient.setEstado(details.getEstado());
        patient.setEstadoCivil(details.getEstadoCivil());
        patient.setOcupacion(details.getOcupacion());

        if (!"PACIENTE".equals(user.getRol())) {
            patient.setMotivoConsulta(details.getMotivoConsulta());
            patient.setEstudiosImagen(details.getEstudiosImagen());
            patient.setPracticaDeporte(details.getPracticaDeporte());
            patient.setDeportePracticado(details.getDeportePracticado());
            patient.setPadeceDiabetes(details.getPadeceDiabetes());
            patient.setPadeceHipertension(details.getPadeceHipertension());
            patient.setOtrosPadecimientos(details.getOtrosPadecimientos());
            patient.setMedicoTratante(details.getMedicoTratante());

            // Update estatus and sync with login account (only Admin/Fisio can change this)
            if (details.getEstatus() != null) {
                patient.setEstatus(details.getEstatus());
                Optional<Account> accountOpt = accountRepository.findByUsername(patient.getEmail());
                accountOpt.ifPresent(acc -> {
                    acc.setEstatus(details.getEstatus());
                    accountRepository.save(acc);
                });
            }
        }

        Paciente updatedPatient = pacienteRepository.save(patient);
        return ResponseEntity.ok(updatedPatient);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePaciente(@PathVariable Long id) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || (!"ADMIN".equals(user.getRol()) && !"SUPER_ADMIN".equals(user.getRol()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Admin role required."));
        }

        Optional<Paciente> patientOpt = pacienteRepository.findById(id);
        if (patientOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Patient not found"));
        }

        Paciente patient = patientOpt.get();

        if (!"SUPER_ADMIN".equals(user.getRol()) && !patient.getClinicaId().equals(user.getClinicaId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Clinic tenant mismatch."));
        }

        // Delete Patient and login account
        Optional<Account> accountOpt = accountRepository.findByUsername(patient.getEmail());
        accountOpt.ifPresent(account -> accountRepository.delete(account));
        pacienteRepository.delete(patient);

        return ResponseEntity.ok(Map.of("message", "Patient and portal account deleted successfully"));
    }

    // --- Sub-resource: VALORACIONES (Clinical Assessments) ---

    @PostMapping("/{id}/valoraciones")
    public ResponseEntity<?> createValoracion(@PathVariable Long id, @RequestBody Valoracion valoracion) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || !"FISIOTERAPEUTA".equals(user.getRol())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Only FISIOTERAPEUTA can record clinical assessments."));
        }

        Optional<Paciente> patientOpt = pacienteRepository.findById(id);
        if (patientOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Patient not found"));
        }

        Paciente patient = patientOpt.get();
        if (!patient.getClinicaId().equals(user.getClinicaId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Tenant clinic mismatch."));
        }

        Optional<Fisioterapeuta> doctorOpt = fisioterapeutaRepository.findByEmail(user.getUsername());
        if (doctorOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Physiotherapist profile not found"));
        }

        if (valoracion.getDiagnostico() == null || valoracion.getTratamientoIndicado() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Diagnostico and Tratamiento Indicado are required"));
        }

        valoracion.setPacienteId(patient.getId());
        valoracion.setFisioterapeutaId(doctorOpt.get().getId());
        valoracion.setCreatedBy(user.getUsername());
        valoracion.setFechaValoracion(LocalDateTime.now());

        Valoracion savedVal = valoracionRepository.save(valoracion);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedVal);
    }

    @GetMapping("/{id}/valoraciones")
    public ResponseEntity<?> getValoraciones(@PathVariable Long id) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Optional<Paciente> patientOpt = pacienteRepository.findById(id);
        if (patientOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Patient not found"));
        }

        Paciente patient = patientOpt.get();

        // Multi-tenant check
        if (!"SUPER_ADMIN".equals(user.getRol())) {
            if ("PACIENTE".equals(user.getRol())) {
                if (!patient.getEmail().equals(user.getUsername())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. You can only view your own assessments."));
                }
            } else {
                if (!patient.getClinicaId().equals(user.getClinicaId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Clinic tenant mismatch."));
                }
            }
        }

        return ResponseEntity.ok(valoracionRepository.findByPacienteId(patient.getId()));
    }
}
