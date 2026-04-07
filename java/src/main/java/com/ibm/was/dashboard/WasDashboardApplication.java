package com.ibm.was.dashboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry-point for all three deployment modes:
 *   JAR  :  java -jar was-dashboard.jar
 *   WAR  :  deploy was-dashboard.war to WebSphere / Tomcat
 *   APP  :  wrap with launch4j / jpackage for a native executable
 */
@SpringBootApplication
@EnableScheduling
@EnableAsync
public class WasDashboardApplication extends SpringBootServletInitializer {

    /** Called by Servlet container (WebSphere / Tomcat) when deployed as WAR. */
    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
        return builder.sources(WasDashboardApplication.class);
    }

    public static void main(String[] args) {
        SpringApplication.run(WasDashboardApplication.class, args);
    }
}
