package com.fisioplus;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling  // Activa los @Scheduled del RecordatorioScheduler
@EnableAsync       // Activa los @Async del NotificacionService
public class FisioPlusApplication {
    public static void main(String[] args) {
        SpringApplication.run(FisioPlusApplication.class, args);
    }
}
