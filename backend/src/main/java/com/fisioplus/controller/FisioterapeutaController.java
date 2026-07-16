package com.fisioplus.controller;

import com.fisioplus.entity.Account;
import com.fisioplus.entity.Fisioterapeuta;
import com.fisioplus.repository.AccountRepository;
import com.fisioplus.repository.FisioterapeutaRepository;
import com.fisioplus.security.JwtFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/fisioterapeutas")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class FisioterapeutaController {

    @Autowired
    private FisioterapeutaRepository fisioterapeutaRepository;

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

    @GetMapping
    public ResponseEntity<?> getFisioterapeutas() {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        if ("SUPER_ADMIN".equals(user.getRol())) {
            return ResponseEntity.ok(fisioterapeutaRepository.findAll());
        }

        // Return only physiotherapists belonging to the user's clinic
        return ResponseEntity.ok(fisioterapeutaRepository.findByClinicaId(user.getClinicaId()));
    }

    @PostMapping
    public ResponseEntity<?> createFisioterapeuta(@RequestBody Fisioterapeuta doctor) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || (!"ADMIN".equals(user.getRol()) && !"SUPER_ADMIN".equals(user.getRol()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Admin role required."));
        }

        if (doctor.getNombre() == null || doctor.getApellidoPaterno() == null || doctor.getEmail() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nombre, Apellido Paterno, and Email are required"));
        }

        if (accountRepository.existsByUsername(doctor.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is already registered as an account username"));
        }

        // Set clinic isolation
        if (!"SUPER_ADMIN".equals(user.getRol())) {
            doctor.setClinicaId(user.getClinicaId());
        }

        // Generate Alias: first letter of first name + father's surname in lowercase, without spaces/special chars
        String cleanName = doctor.getNombre().toLowerCase().replaceAll("\\s+", "").substring(0, 1);
        String cleanSurname = doctor.getApellidoPaterno().toLowerCase().replaceAll("\\s+", "");
        String alias = cleanName + cleanSurname;
        doctor.setAlias(alias);

        // Audit tags
        doctor.setCreatedBy(user.getUsername());
        doctor.setUpdatedBy(user.getUsername());

        // Save Fisioterapeuta
        Fisioterapeuta savedDoctor = fisioterapeutaRepository.save(doctor);

        // Autogenerate access account
        Account doctorAccount = Account.builder()
                .username(doctor.getEmail())
                .password(passwordEncoder.encode(alias)) // Initial password is the alias
                .alias(alias)
                .rol("FISIOTERAPEUTA")
                .estatus("ACTIVO")
                .clinicaId(doctor.getClinicaId())
                .createdBy(user.getUsername())
                .updatedBy(user.getUsername())
                .build();

        accountRepository.save(doctorAccount);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "fisioterapeuta", savedDoctor,
                "accountUsername", doctorAccount.getUsername(),
                "accountInitialPassword", alias
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateFisioterapeuta(@PathVariable Long id, @RequestBody Fisioterapeuta details) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Optional<Fisioterapeuta> doctorOpt = fisioterapeutaRepository.findById(id);
        if (doctorOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Physiotherapist not found"));
        }

        Fisioterapeuta doctor = doctorOpt.get();

        // Multi-tenant authorization check
        if (!"SUPER_ADMIN".equals(user.getRol())) {
            if ("FISIOTERAPEUTA".equals(user.getRol())) {
                // A physiotherapist can only update their own records
                if (!doctor.getEmail().equals(user.getUsername())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. You can only update your own details."));
                }
            } else if ("ADMIN".equals(user.getRol())) {
                // An admin can only update doctors in their clinic
                if (!doctor.getClinicaId().equals(user.getClinicaId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Clinic tenant mismatch."));
                }
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied."));
            }
        }

        // Apply edits
        doctor.setNombre(details.getNombre());
        doctor.setApellidoPaterno(details.getApellidoPaterno());
        doctor.setApellidoMaterno(details.getApellidoMaterno());
        doctor.setFechaNacimiento(details.getFechaNacimiento());
        doctor.setGenero(details.getGenero());
        doctor.setTelefono(details.getTelefono());
        doctor.setDireccion(details.getDireccion());
        doctor.setCiudad(details.getCiudad());
        doctor.setEstado(details.getEstado());
        doctor.setUpdatedBy(user.getUsername());

        // Update estatus and sync with login account
        if (details.getEstatus() != null) {
            doctor.setEstatus(details.getEstatus());
            Optional<Account> accountOpt = accountRepository.findByUsername(doctor.getEmail());
            accountOpt.ifPresent(acc -> {
                acc.setEstatus(details.getEstatus());
                accountRepository.save(acc);
            });
        }

        Fisioterapeuta updatedDoctor = fisioterapeutaRepository.save(doctor);
        return ResponseEntity.ok(updatedDoctor);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFisioterapeuta(@PathVariable Long id) {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null || (!"ADMIN".equals(user.getRol()) && !"SUPER_ADMIN".equals(user.getRol()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Admin role required."));
        }

        Optional<Fisioterapeuta> doctorOpt = fisioterapeutaRepository.findById(id);
        if (doctorOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Physiotherapist not found"));
        }

        Fisioterapeuta doctor = doctorOpt.get();

        if (!"SUPER_ADMIN".equals(user.getRol()) && !doctor.getClinicaId().equals(user.getClinicaId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied. Clinic tenant mismatch."));
        }

        // Delete Fisioterapeuta and their user login account
        Optional<Account> accountOpt = accountRepository.findByUsername(doctor.getEmail());
        accountOpt.ifPresent(account -> accountRepository.delete(account));
        fisioterapeutaRepository.delete(doctor);

        return ResponseEntity.ok(Map.of("message", "Physiotherapist and login account deleted successfully"));
    }
}
