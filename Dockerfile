# Multi-stage Dockerfile for Music Guesser FastAPI Server
# Build stage: Install dependencies
FROM python:3.11-slim as builder

WORKDIR /app
COPY server/requirements.txt .

# Install dependencies to user site-packages
RUN pip install --user --no-cache-dir -r requirements.txt

# Runtime stage: Minimal production image
FROM python:3.11-slim

WORKDIR /app

# Copy only Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Set PATH to use local pip installations
ENV PATH=/root/.local/bin:$PATH

# Copy server code
COPY server/ ./

# Production configuration
ENV PORT=8000
ENV HOST=0.0.0.0
ENV DEBUG=False

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import socket; socket.create_connection(('localhost', 8000), timeout=2)" || exit 1

EXPOSE 8000

CMD ["python", "main.py"]
