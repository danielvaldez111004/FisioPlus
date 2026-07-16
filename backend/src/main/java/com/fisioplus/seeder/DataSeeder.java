package com.fisioplus.seeder;

import com.fisioplus.entity.*;
import com.fisioplus.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private ClinicaRepository clinicaRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private FisioterapeutaRepository fisioterapeutaRepository;

    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired
    private ServicioRepository servicioRepository;

    @Autowired
    private ServicioContratadoRepository servicioContratadoRepository;

    @Autowired
    private CitaRepository citaRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (accountRepository.existsByUsername("superadmin@fisioplus.com")) {
            System.out.println(">>> Database already seeded. Skipping seeder.");
            return;
        }

        System.out.println(">>> Seeding database for FisioPlus...");

        // 1. Create SUPER_ADMIN account
        Account superAdmin = Account.builder()
                .username("superadmin@fisioplus.com")
                .password(passwordEncoder.encode("superadmin"))
                .alias("superadmin")
                .rol("SUPER_ADMIN")
                .estatus("ACTIVO")
                .clinicaId(null)
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();
        accountRepository.save(superAdmin);

        // 2. Create Clinics (Tenants)
        Clinica clinicaA = Clinica.builder()
                .nombreClinica("FisioPlus Centro")
                .email("admin@fisioplus.com")
                .tipoRegistro("PRUEBA")
                .direccion("Av. de la Salud 123, Centro")
                .telefono("555-0199")
                .ciudad("Ciudad de México")
                .estado("CDMX")
                .pais("México")
                .pacientesPorHora(4)
                .createdBy("superadmin@fisioplus.com")
                .updatedBy("superadmin@fisioplus.com")
                .build();
        clinicaA = clinicaRepository.save(clinicaA);

        Clinica clinicaB = Clinica.builder()
                .nombreClinica("Salud Vital")
                .email("saludvital@fisioplus.com")
                .tipoRegistro("CONTRATADO")
                .direccion("Calle Fisioterapia 456, Norte")
                .telefono("555-0288")
                .ciudad("Monterrey")
                .estado("Nuevo León")
                .pais("México")
                .pacientesPorHora(2)
                .createdBy("superadmin@fisioplus.com")
                .updatedBy("superadmin@fisioplus.com")
                .build();
        clinicaB = clinicaRepository.save(clinicaB);

        // 3. Create Clinic ADMIN Accounts
        Account adminA = Account.builder()
                .username("admin@fisioplus.com")
                .password(passwordEncoder.encode("fisiopluscentro"))
                .alias("fisiopluscentro")
                .rol("ADMIN")
                .estatus("ACTIVO")
                .clinicaId(clinicaA.getId())
                .createdBy("superadmin@fisioplus.com")
                .updatedBy("superadmin@fisioplus.com")
                .build();
        accountRepository.save(adminA);

        Account adminB = Account.builder()
                .username("saludvital@fisioplus.com")
                .password(passwordEncoder.encode("saludvital"))
                .alias("saludvital")
                .rol("ADMIN")
                .estatus("ACTIVO")
                .clinicaId(clinicaB.getId())
                .createdBy("superadmin@fisioplus.com")
                .updatedBy("superadmin@fisioplus.com")
                .build();
        accountRepository.save(adminB);

        // 4. Create Fisioterapeutas
        Fisioterapeuta doctorA = Fisioterapeuta.builder()
                .nombre("Santiago")
                .apellidoPaterno("Valdez")
                .apellidoMaterno("Alberto")
                .fechaNacimiento(LocalDate.of(1985, 4, 15))
                .genero("MASCULINO")
                .email("svaldez@fisioplus.com")
                .telefono("555-1111")
                .direccion("Av. Juárez 10")
                .ciudad("CDMX")
                .estado("CDMX")
                .alias("svaldez")
                .clinicaId(clinicaA.getId())
                .createdBy("admin@fisioplus.com")
                .updatedBy("admin@fisioplus.com")
                .build();
        doctorA = fisioterapeutaRepository.save(doctorA);

        Account doctorAAccount = Account.builder()
                .username("svaldez@fisioplus.com")
                .password(passwordEncoder.encode("svaldez"))
                .alias("svaldez")
                .rol("FISIOTERAPEUTA")
                .estatus("ACTIVO")
                .clinicaId(clinicaA.getId())
                .createdBy("admin@fisioplus.com")
                .updatedBy("admin@fisioplus.com")
                .build();
        accountRepository.save(doctorAAccount);

        Fisioterapeuta doctorB = Fisioterapeuta.builder()
                .nombre("Laura")
                .apellidoPaterno("Gómez")
                .apellidoMaterno("Pérez")
                .fechaNacimiento(LocalDate.of(1990, 8, 22))
                .genero("FEMENINO")
                .email("lgomez@fisioplus.com")
                .telefono("555-2222")
                .direccion("Calle Morelos 20")
                .ciudad("Monterrey")
                .estado("Nuevo León")
                .alias("lgomez")
                .clinicaId(clinicaB.getId())
                .createdBy("saludvital@fisioplus.com")
                .updatedBy("saludvital@fisioplus.com")
                .build();
        doctorB = fisioterapeutaRepository.save(doctorB);

        Account doctorBAccount = Account.builder()
                .username("lgomez@fisioplus.com")
                .password(passwordEncoder.encode("lgomez"))
                .alias("lgomez")
                .rol("FISIOTERAPEUTA")
                .estatus("ACTIVO")
                .clinicaId(clinicaB.getId())
                .createdBy("saludvital@fisioplus.com")
                .updatedBy("saludvital@fisioplus.com")
                .build();
        accountRepository.save(doctorBAccount);

        // 5. Create Pacientes
        Paciente pacienteA = Paciente.builder()
                .nombre("Carlos")
                .apellidoPaterno("Martínez")
                .apellidoMaterno("Sánchez")
                .genero("MASCULINO")
                .estadoCivil("SOLTERO")
                .ocupacion("Ingeniero")
                .email("cmartinez@fisioplus.com")
                .telefono("555-3333")
                .direccion("Calle Pino 3")
                .ciudad("CDMX")
                .estado("CDMX")
                .motivoConsulta("Dolor severo en espalda baja tras levantar pesas.")
                .estudiosImagen("Radiografía de columna lumbar (RX)")
                .practicaDeporte(true)
                .deportePracticado("Gimnasio/Crossfit")
                .padeceDiabetes(false)
                .padeceHipertension(false)
                .otrosPadecimientos("Ninguno")
                .medicoTratante("Dr. Roberto Ruiz")
                .alias("cmartinez")
                .clinicaId(clinicaA.getId())
                .build();
        pacienteA = pacienteRepository.save(pacienteA);

        Account pacienteAAccount = Account.builder()
                .username("cmartinez@fisioplus.com")
                .password(passwordEncoder.encode("cmartinez"))
                .alias("cmartinez")
                .rol("PACIENTE")
                .estatus("ACTIVO")
                .clinicaId(clinicaA.getId())
                .createdBy("admin@fisioplus.com")
                .updatedBy("admin@fisioplus.com")
                .build();
        accountRepository.save(pacienteAAccount);

        Paciente pacienteB = Paciente.builder()
                .nombre("Ana")
                .apellidoPaterno("López")
                .apellidoMaterno("Díaz")
                .genero("FEMENINO")
                .estadoCivil("CASADO")
                .ocupacion("Diseñadora")
                .email("alopez@fisioplus.com")
                .telefono("555-4444")
                .direccion("Av. del Sol 40")
                .ciudad("Monterrey")
                .estado("Nuevo León")
                .motivoConsulta("Esguince de tobillo derecho de segundo grado.")
                .estudiosImagen("Resonancia magnética de tobillo (MRI)")
                .practicaDeporte(false)
                .padeceDiabetes(false)
                .padeceHipertension(true)
                .otrosPadecimientos("Ninguno")
                .medicoTratante("Dra. Silvia Ortiz")
                .alias("alopez")
                .clinicaId(clinicaB.getId())
                .build();
        pacienteB = pacienteRepository.save(pacienteB);

        Account pacienteBAccount = Account.builder()
                .username("alopez@fisioplus.com")
                .password(passwordEncoder.encode("alopez"))
                .alias("alopez")
                .rol("PACIENTE")
                .estatus("ACTIVO")
                .clinicaId(clinicaB.getId())
                .createdBy("saludvital@fisioplus.com")
                .updatedBy("saludvital@fisioplus.com")
                .build();
        accountRepository.save(pacienteBAccount);

        // 6. Create Base Templates Services (Super Admin)
        Servicio serviceBase1 = Servicio.builder()
                .descripcion("Electroterapia + Ultrasonido")
                .cantidadTerapias(10)
                .precio(new BigDecimal("2500.00"))
                .estatus("ACTIVO")
                .esBase(true)
                .clinicaId(null)
                .servicioBaseId(null)
                .createdBy("superadmin@fisioplus.com")
                .updatedBy("superadmin@fisioplus.com")
                .build();
        serviceBase1 = servicioRepository.save(serviceBase1);

        Servicio serviceBase2 = Servicio.builder()
                .descripcion("Rehabilitación Deportiva Integral")
                .cantidadTerapias(12)
                .precio(new BigDecimal("3600.00"))
                .estatus("ACTIVO")
                .esBase(true)
                .clinicaId(null)
                .servicioBaseId(null)
                .createdBy("superadmin@fisioplus.com")
                .updatedBy("superadmin@fisioplus.com")
                .build();
        serviceBase2 = servicioRepository.save(serviceBase2);

        // 7. Create customized services for Clinic A (FisioPlus Centro)
        Servicio customServiceA1 = Servicio.builder()
                .descripcion("Electroterapia + Ultrasonido (Centro)")
                .cantidadTerapias(10)
                .precio(new BigDecimal("2800.00")) // Customized price
                .estatus("ACTIVO")
                .esBase(false)
                .clinicaId(clinicaA.getId())
                .servicioBaseId(serviceBase1.getId())
                .createdBy("admin@fisioplus.com")
                .updatedBy("admin@fisioplus.com")
                .build();
        customServiceA1 = servicioRepository.save(customServiceA1);

        // 8. Create customized services for Clinic B (Salud Vital)
        Servicio customServiceB2 = Servicio.builder()
                .descripcion("Rehabilitación Deportiva Integral (Salud Vital)")
                .cantidadTerapias(12)
                .precio(new BigDecimal("3400.00")) // Customized price
                .estatus("ACTIVO")
                .esBase(false)
                .clinicaId(clinicaB.getId())
                .servicioBaseId(serviceBase2.getId())
                .createdBy("saludvital@fisioplus.com")
                .updatedBy("saludvital@fisioplus.com")
                .build();
        customServiceB2 = servicioRepository.save(customServiceB2);

        // 9. Contract Services for Patients
        ServicioContratado contractA = ServicioContratado.builder()
                .servicioId(customServiceA1.getId())
                .pacienteId(pacienteA.getId())
                .fisioterapeutaId(doctorA.getId())
                .diagnostico("Hernia de disco L5-S1 leve. Requiere terapia desinflamatoria y fortalecimiento core.")
                .cantidadSesiones(10)
                .precioUnitario(new BigDecimal("280.00"))
                .total(new BigDecimal("2800.00"))
                .createdBy("admin@fisioplus.com")
                .build();
        contractA = servicioContratadoRepository.save(contractA);

        ServicioContratado contractB = ServicioContratado.builder()
                .servicioId(customServiceB2.getId())
                .pacienteId(pacienteB.getId())
                .fisioterapeutaId(doctorB.getId())
                .diagnostico("Esguince de tobillo grado II. Requiere movilización, ultrasonido y propiocepción.")
                .cantidadSesiones(12)
                .precioUnitario(new BigDecimal("283.33"))
                .total(new BigDecimal("3400.00"))
                .createdBy("saludvital@fisioplus.com")
                .build();
        contractB = servicioContratadoRepository.save(contractB);

        // 10. Create Appointments (Citas)
        // Appointment A (Programmed for Carlos Martínez in FisioPlus Centro)
        LocalDateTime tomorrow = LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.of(10, 0));
        Cita appointmentA = Cita.builder()
                .descripcion("Primera Sesión - Electroterapia")
                .servicioContratadoId(contractA.getId())
                .fisioterapeutaId(doctorA.getId())
                .numeroSesion(1)
                .fechaProgramacion(LocalDateTime.now())
                .fechaInicio(tomorrow)
                .fechaFin(tomorrow.plusHours(1))
                .estatus("PROGRAMADA")
                .indicacionesPrevioCita("Traer short cómodo y radiografía impresa.")
                .clinicaId(clinicaA.getId())
                .createdBy("admin@fisioplus.com")
                .updatedBy("admin@fisioplus.com")
                .build();
        citaRepository.save(appointmentA);

        // Appointment B (Programmed for Ana López in Salud Vital)
        LocalDateTime tomorrowAfternoon = LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.of(16, 0));
        Cita appointmentB = Cita.builder()
                .descripcion("Evaluación Inicial - Tobillo")
                .servicioContratadoId(contractB.getId())
                .fisioterapeutaId(doctorB.getId())
                .numeroSesion(1)
                .fechaProgramacion(LocalDateTime.now())
                .fechaInicio(tomorrowAfternoon)
                .fechaFin(tomorrowAfternoon.plusHours(1))
                .estatus("PROGRAMADA")
                .indicacionesPrevioCita("Traer ropa deportiva. No aplicar cremas ni ungüentos.")
                .clinicaId(clinicaB.getId())
                .createdBy("saludvital@fisioplus.com")
                .updatedBy("saludvital@fisioplus.com")
                .build();
        citaRepository.save(appointmentB);

        System.out.println(">>> Database seeded successfully with SuperAdmin, 2 Clinics, 2 Doctors, 2 Patients, 2 Contracts, and 2 Appointments!");
    }
}
