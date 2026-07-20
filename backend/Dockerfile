FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["sh", "-c", "until alembic upgrade head; do echo 'Esperando a la base de datos...'; sleep 2; done && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
