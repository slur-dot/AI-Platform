# Stage 1: Builder
FROM python:3.12-slim AS builder

WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Production
FROM python:3.12-slim

# Create a non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy source code
COPY . .

# Change ownership to non-root user
RUN chown -R appuser:appuser /app
RUN mkdir -p /tmp && chown -R appuser:appuser /tmp

USER appuser

# Worker doesn't need to expose any ports
# Run the application
CMD ["python", "-m", "src.main"]
