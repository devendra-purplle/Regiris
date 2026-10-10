# Stage 1: Build Java artifact with Maven
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Build application
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime container
# glibc-based JRE: the ONNX runtime used for local all-MiniLM embeddings needs libstdc++ (not available on Alpine/musl)
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Create storage directory
RUN mkdir -p /data/storage

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8081

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD curl -f http://localhost:8081/api/v1/ingest/health || exit 0

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
