package com.fisioplus.service;

import com.fisioplus.entity.Cita;
import com.fisioplus.entity.CitaAccionToken;
import com.fisioplus.repository.CitaAccionTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Gestiona la generación y validación de tokens de acción para citas.
 * Garantiza que exista un solo token activo (acción pendiente) por cita.
 */
@Service
public class TokenService {

    private final CitaAccionTokenRepository tokenRepository;

    @Value("${fisioplus.app.token-expiry-hours:26}")
    private int tokenExpiryHours;

    public TokenService(CitaAccionTokenRepository tokenRepository) {
        this.tokenRepository = tokenRepository;
    }

    /**
     * Recupera el token activo para una cita o crea uno nuevo si no existe.
     * Idempotente: el scheduler puede llamarlo varias veces sin crear duplicados.
     *
     * @param cita       La cita para la que se genera el token.
     * @param pacienteId El ID del paciente dueño de la cita.
     * @return El token activo (existente o recién creado).
     */
    @Transactional
    public CitaAccionToken getOrCreateToken(Cita cita, Long pacienteId) {
        return tokenRepository.findByCitaIdAndAccionRealizadaIsNull(cita.getId())
                .orElseGet(() -> {
                    String tokenValue = UUID.randomUUID().toString().replace("-", "");
                    CitaAccionToken token = CitaAccionToken.builder()
                            .token(tokenValue)
                            .citaId(cita.getId())
                            .pacienteId(pacienteId)
                            .expiresAt(cita.getFechaInicio().plusHours(tokenExpiryHours))
                            .emailEnviado(false)
                            .whatsappEnviado(false)
                            .toastGenerado(false)
                            .build();
                    return tokenRepository.save(token);
                });
    }

    /**
     * Valida que el token existe y no ha expirado.
     * No filtra por accionRealizada — eso lo maneja CitaAccionService
     * para poder dar respuestas idempotentes informativas.
     *
     * @param tokenStr El valor UUID hex del token.
     * @return Optional con el token si es válido, vacío si no existe o expiró.
     */
    public Optional<CitaAccionToken> validarToken(String tokenStr) {
        return tokenRepository.findByToken(tokenStr)
                .filter(t -> !t.isExpired());
    }
}
