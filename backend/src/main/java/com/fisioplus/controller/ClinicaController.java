package com.fisioplus.controller;

import com.fisioplus.entity.Account;
import com.fisioplus.entity.Clinica;
import com.fisioplus.entity.HorarioClinica;
import com.fisioplus.repository.AccountRepository;
import com.fisioplus.repository.ClinicaRepository;
import com.fisioplus.repository.HorarioClinicaRepository;
import com.fisioplus.security.JwtFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/clinicas")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class ClinicaController {

    @Autowired
    private ClinicaRepository clinicaRepository;

    @Autowired
    private HorarioClinicaRepository horarioClinicaRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private JwtFilter.CustomUserDetails getAuthenticatedUser() {
        Object details = SecurityContextHolder.getContext().getAuthentication().getDetails();
        if (details instanceof JwtFilter.CustomUserDetails) {
            return (JwtFilter.CustomUserDetails) details;
        }
        return null;
    }

    private boolean isSuperAdmin() {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        return user != null && "SUPER_ADMIN".equals(user.getRol());
    }

    @GetMapping
    public ResponseEntity<?> getAllClinicas() {
        if (!isSuperAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. SUPER_ADMIN role required."));
        }
        return ResponseEntity.ok(clinicaRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> createClinica(@RequestBody Clinica clinica) {
        if (!isSuperAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. SUPER_ADMIN role required."));
        }

        if (clinica.getEmail() == null || clinica.getNombreClinica() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and Nombre Clinica are required"));
        }

        if (accountRepository.existsByUsername(clinica.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is already registered as an account username"));
        }

        // Set creator metadata
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        clinica.setCreatedBy(user.getUsername());
        clinica.setUpdatedBy(user.getUsername());
        clinica.setEstatus("ACTIVO");

        // Save Clinica
        Clinica savedClinica = clinicaRepository.save(clinica);

        // Generate automatic ADMIN Account
        // Password = nombre_clinica in lowercase, no spaces
        String plainPassword = clinica.getNombreClinica().toLowerCase().replaceAll("\\s+", "");
        
        Account adminAccount = Account.builder()
                .username(clinica.getEmail())
                .password(passwordEncoder.encode(plainPassword))
                .alias(plainPassword)
                .rol("ADMIN")
                .estatus("ACTIVO")
                .clinicaId(savedClinica.getId())
                .createdBy(user.getUsername())
                .updatedBy(user.getUsername())
                .build();

        accountRepository.save(adminAccount);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "clinica", savedClinica,
                "adminAccountUsername", adminAccount.getUsername(),
                "adminAccountInitialPassword", plainPassword
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateClinica(@PathVariable Long id, @RequestBody Clinica clinicaDetails) {
        if (!isSuperAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. SUPER_ADMIN role required."));
        }

        Optional<Clinica> clinicaOpt = clinicaRepository.findById(id);
        if (clinicaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Clinic not found"));
        }

        Clinica clinica = clinicaOpt.get();
        clinica.setNombreClinica(clinicaDetails.getNombreClinica());
        clinica.setDireccion(clinicaDetails.getDireccion());
        clinica.setTelefono(clinicaDetails.getTelefono());
        clinica.setCiudad(clinicaDetails.getCiudad());
        clinica.setEstado(clinicaDetails.getEstado());
        clinica.setPais(clinicaDetails.getPais());
        clinica.setPacientesPorHora(clinicaDetails.getPacientesPorHora());
        clinica.setTipoRegistro(clinicaDetails.getTipoRegistro());
        
        if (clinicaDetails.getEstatus() != null) {
            clinica.setEstatus(clinicaDetails.getEstatus());
            
            // Sync with associated ADMIN account
            Optional<Account> adminAccountOpt = accountRepository.findByUsername(clinica.getEmail());
            adminAccountOpt.ifPresent(acc -> {
                acc.setEstatus(clinicaDetails.getEstatus());
                accountRepository.save(acc);
            });
        }
        
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        clinica.setUpdatedBy(user.getUsername());

        Clinica updatedClinica = clinicaRepository.save(clinica);
        return ResponseEntity.ok(updatedClinica);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteClinica(@PathVariable Long id) {
        if (!isSuperAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. SUPER_ADMIN role required."));
        }

        if (!clinicaRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Clinic not found"));
        }

        // Delete Clinic and all associated Accounts to keep DB integrity
        List<Account> clinicAccounts = accountRepository.findByClinicaId(id);
        accountRepository.deleteAll(clinicAccounts);
        clinicaRepository.deleteById(id);

        return ResponseEntity.ok(Map.of("message", "Clinic and associated accounts deleted successfully"));
    }

    @GetMapping("/mi-clinica")
    public ResponseEntity<?> getMiClinica() {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || user.getClinicaId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado o no se encuentra asociado a ninguna clínica"));
        }
        Optional<Clinica> clinicaOpt = clinicaRepository.findById(user.getClinicaId());
        if (clinicaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Clínica no encontrada"));
        }
        return ResponseEntity.ok(clinicaOpt.get());
    }

    @PutMapping("/mi-clinica")
    public ResponseEntity<?> updateMiClinica(@RequestBody Clinica details) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || user.getClinicaId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado o no se encuentra asociado a ninguna clínica"));
        }
        Optional<Clinica> clinicaOpt = clinicaRepository.findById(user.getClinicaId());
        if (clinicaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Clínica no encontrada"));
        }
        Clinica clinica = clinicaOpt.get();
        clinica.setNombreClinica(details.getNombreClinica());
        clinica.setDireccion(details.getDireccion());
        clinica.setTelefono(details.getTelefono());
        clinica.setCiudad(details.getCiudad());
        clinica.setEstado(details.getEstado());
        clinica.setPais(details.getPais());
        if (details.getPacientesPorHora() != null) {
            clinica.setPacientesPorHora(details.getPacientesPorHora());
        }
        clinica.setUpdatedBy(user.getUsername());
        
        Clinica saved = clinicaRepository.save(clinica);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/mi-clinica/horarios")
    public ResponseEntity<?> getMiClinicaHorarios() {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || user.getClinicaId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado o no se encuentra asociado a ninguna clínica"));
        }
        List<HorarioClinica> horarios = horarioClinicaRepository.findByClinicaId(user.getClinicaId());
        return ResponseEntity.ok(horarios);
    }

    @PutMapping("/mi-clinica/horarios")
    public ResponseEntity<?> updateMiClinicaHorarios(@RequestBody List<Map<String, Object>> payload) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || user.getClinicaId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autorizado o no se encuentra asociado a ninguna clínica"));
        }
        return saveHorariosForClinicaId(user.getClinicaId(), payload);
    }

    @GetMapping("/{id}/horarios")
    public ResponseEntity<?> getHorariosByClinicaId(@PathVariable Long id) {
        if (!isSuperAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. SUPER_ADMIN role required."));
        }
        List<HorarioClinica> horarios = horarioClinicaRepository.findByClinicaId(id);
        return ResponseEntity.ok(horarios);
    }

    @PutMapping("/{id}/horarios")
    public ResponseEntity<?> updateHorariosByClinicaId(@PathVariable Long id, @RequestBody List<Map<String, Object>> payload) {
        if (!isSuperAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. SUPER_ADMIN role required."));
        }
        return saveHorariosForClinicaId(id, payload);
    }

    private ResponseEntity<?> saveHorariosForClinicaId(Long clinicaId, List<Map<String, Object>> payload) {
        List<HorarioClinica> existing = horarioClinicaRepository.findByClinicaId(clinicaId);
        
        for (Map<String, Object> hMap : payload) {
            String diaStr = (String) hMap.get("diaSemana");
            String aperturaStr = (String) hMap.get("apertura");
            String cierreStr = (String) hMap.get("cierre");
            Boolean cerrado = (Boolean) hMap.get("cerrado");
            
            if (diaStr != null) {
                com.fisioplus.enums.DiaSemana dia = null;
                String normalized = diaStr.trim().toLowerCase()
                    .replace("á", "a")
                    .replace("é", "e")
                    .replace("í", "i")
                    .replace("ó", "o")
                    .replace("ú", "u");
                
                if (normalized.equals("lunes")) dia = com.fisioplus.enums.DiaSemana.Lunes;
                else if (normalized.equals("martes")) dia = com.fisioplus.enums.DiaSemana.Martes;
                else if (normalized.equals("miercoles")) dia = com.fisioplus.enums.DiaSemana.Miércoles;
                else if (normalized.equals("jueves")) dia = com.fisioplus.enums.DiaSemana.Jueves;
                else if (normalized.equals("viernes")) dia = com.fisioplus.enums.DiaSemana.Viernes;
                else if (normalized.equals("sabado")) dia = com.fisioplus.enums.DiaSemana.Sábado;
                else if (normalized.equals("domingo")) dia = com.fisioplus.enums.DiaSemana.Domingo;
                
                if (dia != null) {
                    HorarioClinica horario = null;
                    for (HorarioClinica eh : existing) {
                        if (eh.getDiaSemana() == dia) {
                            horario = eh;
                            break;
                        }
                    }
                    
                    if (horario == null) {
                        horario = new HorarioClinica();
                        horario.setClinicaId(clinicaId);
                        horario.setDiaSemana(dia);
                    }
                    
                    LocalTime apertura = LocalTime.of(8, 0);
                    LocalTime cierre = LocalTime.of(20, 0);

                    if (aperturaStr != null && !aperturaStr.isEmpty()) {
                        if (aperturaStr.length() == 5) aperturaStr += ":00";
                        apertura = LocalTime.parse(aperturaStr);
                    }
                    if (cierreStr != null && !cierreStr.isEmpty()) {
                        if (cierreStr.length() == 5) cierreStr += ":00";
                        cierre = LocalTime.parse(cierreStr);
                    }
                    
                    horario.setApertura(apertura);
                    horario.setCierre(cierre);
                    horario.setCerrado(cerrado != null ? cerrado : false);
                    
                    horarioClinicaRepository.save(horario);
                }
            }
        }
        
        return ResponseEntity.ok(Map.of("message", "Horarios actualizados correctamente"));
    }
}
