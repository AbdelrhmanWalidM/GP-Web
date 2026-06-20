# Force-rebuild to apply database change
FROM python:3.11-slim


WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and AI models
COPY backend/ /app/backend/
COPY ai_models/ /app/ai_models/

# Hugging Face Spaces runs on port 7860 by default
EXPOSE 7860

# Default environment variables
ENV PORT=7860

CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--chdir", "backend", "app:app"]
