FROM python:3.12-slim

WORKDIR /app

# Installa le dipendenze di sistema necessarie per alcune librerie (come pytesseract)
RUN apt-get update && apt-get install -y tesseract-ocr libtesseract-dev && rm -rf /var/lib/apt/lists/*

COPY ./backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ./backend /app/backend

WORKDIR /app/backend

# Hugging Face Spaces richiede obbligatoriamente che l'app ascolti sulla porta 7860
ENV PORT=7860
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]
