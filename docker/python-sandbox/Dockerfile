# Minimal Python image for secure sandboxed execution
FROM python:3.11-slim

# Install required data analysis libraries (include pyarrow to avoid pandas warnings)
RUN pip install --no-cache-dir pandas==2.2.0 numpy==1.26.4 pyarrow==14.0.2

# Create non-root user for security
RUN useradd -m -u 1000 sandbox && \
    mkdir -p /app /data && \
    chown -R sandbox:sandbox /app /data

# Set working directory
WORKDIR /app

# Switch to non-root user
USER sandbox

# Default command (will be overridden)
CMD ["python", "-c", "print('Sandbox ready')"]
