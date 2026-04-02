FROM python:3.12-slim

WORKDIR /app

# Copy the data_scrapper module (the RAG pipeline the API imports from)
COPY data_scrapper/ ./data_scrapper/

# Copy the API
COPY api/ ./api/

# Install dependencies
RUN pip install --no-cache-dir -r api/requirements.txt

# Expose port (Railway injects $PORT at runtime)
EXPOSE 8000

# Start command is set in railway.toml (scrape then serve).
# Fallback for non-Railway environments:
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
