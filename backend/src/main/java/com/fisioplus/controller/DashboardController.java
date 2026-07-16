package com.fisioplus.controller;

import com.fisioplus.entity.*;
import com.fisioplus.repository.*;
import com.fisioplus.security.JwtFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class DashboardController {

    @Autowired
    private ClinicaRepository clinicaRepository;

    @Autowired
    private FisioterapeutaRepository fisioterapeutaRepository;

    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired
    private CitaRepository citaRepository;

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
    public ResponseEntity<?> getDashboardData() {
        JwtFilter.CustomUserDetails user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Map<String, Object> data = new HashMap<>();
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        if ("SUPER_ADMIN".equals(user.getRol())) {
            // Super Admin Metrics
            List<Clinica> clinicas = clinicaRepository.findAll();
            long totalPacientes = pacienteRepository.count();
            long totalDoctores = fisioterapeutaRepository.count();
            
            long citasHoy = citaRepository.findAll().stream()
                    .filter(cita -> cita.getFechaInicio().isAfter(startOfDay) && cita.getFechaInicio().isBefore(endOfDay))
                    .count();

            data.put("clinicasCount", clinicas.size());
            data.put("totalPacientesGlobal", totalPacientes);
            data.put("totalFisioterapeutasGlobal", totalDoctores);
            data.put("citasHoyGlobal", citasHoy);
            data.put("clinicas", clinicas);
            
        } else if ("ADMIN".equals(user.getRol())) {
            // Admin Metrics (Single Clinic Tenant)
            Long clinicaId = user.getClinicaId();
            
            List<Fisioterapeuta> doctores = fisioterapeutaRepository.findByClinicaId(clinicaId);
            List<Paciente> pacientes = pacienteRepository.findByClinicaId(clinicaId);
            List<Cita> citasHoy = citaRepository.findByClinicaIdAndFechaInicioBetween(clinicaId, startOfDay, endOfDay);

            long programadas = citasHoy.stream().filter(c -> "PROGRAMADA".equals(c.getEstatus())).count();
            long enProceso = citasHoy.stream().filter(c -> "EN_PROCESO".equals(c.getEstatus())).count();
            long terminadas = citasHoy.stream().filter(c -> "TERMINADA".equals(c.getEstatus())).count();
            long canceladas = citasHoy.stream().filter(c -> "CANCELADA".equals(c.getEstatus())).count();

            data.put("totalPacientes", pacientes.size());
            data.put("totalFisioterapeutas", doctores.size());
            data.put("totalCitasHoy", citasHoy.size());
            data.put("statusCounts", Map.of(
                    "PROGRAMADA", programadas,
                    "EN_PROCESO", enProceso,
                    "TERMINADA", terminadas,
                    "CANCELADA", canceladas
            ));
            data.put("citasHoy", citasHoy);

        } else if ("FISIOTERAPEUTA".equals(user.getRol())) {
            // Physiotherapist Metrics (Single Doctor)
            Optional<Fisioterapeuta> doctorOpt = fisioterapeutaRepository.findByEmail(user.getUsername());
            if (doctorOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Physiotherapist profile not found"));
            }
            
            Long doctorId = doctorOpt.get().getId();
            List<Cita> citasHoy = citaRepository.findByFisioterapeutaIdAndFechaInicioBetween(doctorId, startOfDay, endOfDay);

            long pendientes = citasHoy.stream().filter(c -> "PROGRAMADA".equals(c.getEstatus())).count();
            long enProceso = citasHoy.stream().filter(c -> "EN_PROCESO".equals(c.getEstatus())).count();
            long terminadas = citasHoy.stream().filter(c -> "TERMINADA".equals(c.getEstatus())).count();

            data.put("totalCitasHoy", citasHoy.size());
            data.put("statusCounts", Map.of(
                    "PENDIENTE", pendientes,
                    "EN_PROCESO", enProceso,
                    "TERMINADA", terminadas
            ));
            data.put("citasHoy", citasHoy);

        } else if ("PACIENTE".equals(user.getRol())) {
            // Patient Metrics (Single Patient Portal)
            Optional<Paciente> patientOpt = pacienteRepository.findByEmail(user.getUsername());
            if (patientOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Patient profile not found"));
            }
            
            Long pacienteId = patientOpt.get().getId();
            List<ServicioContratado> patientContracts = servicioContratadoRepository.findByPacienteId(pacienteId);
            List<Long> contractIds = patientContracts.stream().map(ServicioContratado::getId).toList();
            
            List<Cita> allAppointments = citaRepository.findAll().stream()
                    .filter(cita -> contractIds.contains(cita.getServicioContratadoId()))
                    .toList();

            LocalDateTime now = LocalDateTime.now();
            List<Cita> proximas = allAppointments.stream()
                    .filter(c -> c.getFechaInicio().isAfter(now) && !"CANCELADA".equals(c.getEstatus()))
                    .sorted(Comparator.comparing(Cita::getFechaInicio))
                    .toList();

            List<Cita> pasadas = allAppointments.stream()
                    .filter(c -> c.getFechaInicio().isBefore(now) || "TERMINADA".equals(c.getEstatus()))
                    .sorted(Comparator.comparing(Cita::getFechaInicio).reversed())
                    .toList();

            data.put("paciente", patientOpt.get());
            data.put("proximasCitas", proximas);
            data.put("historialCitas", pasadas);
            data.put("serviciosContratados", patientContracts);
        }

        return ResponseEntity.ok(data);
    }
}
