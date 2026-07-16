package com.fisioplus.controller;

import com.fisioplus.entity.Account;
import com.fisioplus.entity.Clinica;
import com.fisioplus.entity.HorarioClinica;
import com.fisioplus.repository.AccountRepository;
import com.fisioplus.repository.ClinicaRepository;
import com.fisioplus.repository.HorarioClinicaRepository;
import com.fisioplus.security.JwtFilter;
import com.fisioplus.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class AuthController {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private ClinicaRepository clinicaRepository;

    @Autowired
    private HorarioClinicaRepository horarioClinicaRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        }

        Optional<Account> accountOpt = accountRepository.findByUsername(username);

        if (accountOpt.isEmpty() || !passwordEncoder.matches(password, accountOpt.get().getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
        }

        Account account = accountOpt.get();
        if ("INACTIVO".equals(account.getEstatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Account is inactive"));
        }

        String token = jwtUtil.generateToken(account.getId(), account.getUsername(), account.getRol(), account.getClinicaId());

        // Generate response Map
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user_id", account.getId());
        response.put("username", account.getUsername());
        response.put("rol", account.getRol());
        response.put("clinica_id", account.getClinicaId());
        response.put("alias", account.getAlias());

        // Initial default password alert check (e.g. svaldez)
        boolean isDefaultPassword = password.toLowerCase().equals(account.getAlias());
        response.put("recommendPasswordChange", isDefaultPassword);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> payload) {
        Object details = SecurityContextHolder.getContext().getAuthentication().getDetails();
        if (!(details instanceof JwtFilter.CustomUserDetails)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        JwtFilter.CustomUserDetails userDetails = (JwtFilter.CustomUserDetails) details;
        String newPassword = payload.get("newPassword");

        if (newPassword == null || newPassword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "New password is required"));
        }

        Optional<Account> accountOpt = accountRepository.findByUsername(userDetails.getUsername());
        if (accountOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        Account account = accountOpt.get();
        account.setPassword(passwordEncoder.encode(newPassword));
        accountRepository.save(account);

        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @PostMapping("/register-clinic")
    public ResponseEntity<?> registerClinic(@RequestBody Map<String, Object> payload) {
        String nombreClinica = (String) payload.get("nombreClinica");
        String email = (String) payload.get("email");
        String password = (String) payload.get("password");
        String direccion = (String) payload.get("direccion");
        String telefono = (String) payload.get("telefono");
        String ciudad = (String) payload.get("ciudad");
        String estado = (String) payload.get("estado");
        String pais = (String) payload.get("pais");
        
        Integer pacientesPorHora = 4;
        if (payload.get("pacientesPorHora") != null) {
            try {
                pacientesPorHora = Integer.parseInt(payload.get("pacientesPorHora").toString());
            } catch (NumberFormatException e) {
                pacientesPorHora = 4;
            }
        }

        if (nombreClinica == null || nombreClinica.trim().isEmpty() ||
            email == null || email.trim().isEmpty() ||
            password == null || password.trim().isEmpty() ||
            direccion == null || direccion.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Los campos Nombre de Clínica, Correo, Contraseña y Dirección son obligatorios"));
        }

        if (accountRepository.existsByUsername(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "El correo electrónico ya está registrado en el sistema"));
        }

        // 1. Create and Save Clinic
        Clinica clinica = Clinica.builder()
                .nombreClinica(nombreClinica)
                .email(email)
                .tipoRegistro("PRUEBA")
                .direccion(direccion)
                .telefono(telefono)
                .ciudad(ciudad)
                .estado(estado)
                .pais(pais)
                .pacientesPorHora(pacientesPorHora)
                .createdBy(email)
                .updatedBy(email)
                .estatus("ACTIVO")
                .build();

        Clinica savedClinica = clinicaRepository.save(clinica);

        // 2. Create and Save Admin Account
        String alias = email.split("@")[0];

        Account adminAccount = Account.builder()
                .username(email)
                .password(passwordEncoder.encode(password))
                .alias(alias)
                .rol("ADMIN")
                .estatus("ACTIVO")
                .clinicaId(savedClinica.getId())
                .createdBy(email)
                .updatedBy(email)
                .build();

        accountRepository.save(adminAccount);

        // 3. Create and Save Clinic schedules
        List<Map<String, Object>> horariosList = (List<Map<String, Object>>) payload.get("horarios");
        if (horariosList != null && !horariosList.isEmpty()) {
            for (Map<String, Object> hMap : horariosList) {
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

                        HorarioClinica horario = HorarioClinica.builder()
                                .clinicaId(savedClinica.getId())
                                .diaSemana(dia)
                                .apertura(apertura)
                                .cierre(cierre)
                                .cerrado(cerrado != null ? cerrado : false)
                                .build();

                        horarioClinicaRepository.save(horario);
                    }
                }
            }
        } else {
            // Create default schedules
            for (com.fisioplus.enums.DiaSemana d : com.fisioplus.enums.DiaSemana.values()) {
                LocalTime apertura = LocalTime.of(8, 0);
                LocalTime cierre = LocalTime.of(20, 0);
                boolean cerrado = false;

                if (d == com.fisioplus.enums.DiaSemana.Sábado) {
                    cierre = LocalTime.of(14, 0);
                } else if (d == com.fisioplus.enums.DiaSemana.Domingo) {
                    cerrado = true;
                }

                HorarioClinica horario = HorarioClinica.builder()
                        .clinicaId(savedClinica.getId())
                        .diaSemana(d)
                        .apertura(apertura)
                        .cierre(cierre)
                        .cerrado(cerrado)
                        .build();

                horarioClinicaRepository.save(horario);
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Clínica y administrador registrados correctamente",
                "clinicaId", savedClinica.getId(),
                "username", adminAccount.getUsername()
        ));
    }
}
