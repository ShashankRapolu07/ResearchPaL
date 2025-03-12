FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    musl-dev \
    python3-dev \
    libffi-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12

COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT