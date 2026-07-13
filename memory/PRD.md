# inteligent STUDY — PRD

## Original Problem Statement
Piattaforma web moderna "inteligent STUDY" (LearnFlow AI) che trasforma qualsiasi contenuto
(video, articolo, PDF, pagina web, presentazione, podcast, documento, audio, immagini)
in una spiegazione completa, semplice e personalizzata. Non un riassuntore — un vero
maestro che insegna fino a quando l'utente comprende.

## User Personas
- **Studente** (superiori / università) che vuole capire davvero, non memorizzare.
- **Professionista in formazione continua** che studia articoli, paper e video.
- **Autodidatta curioso** che carica contenuti eterogenei per approfondire.

## Architecture
- **Frontend**: React 19 + React Router 7 + Tailwind + Framer Motion + shadcn/ui + sonner.
- **Backend**: FastAPI (Python), Motor (MongoDB async), emergentintegrations (Claude Sonnet 4.5),
  OpenAI Whisper (via Emergent LLM key) per la trascrizione audio.
- **DB**: MongoDB — collezione `sessions` con analisi, messaggi, quiz, note, progressi.
- **AI Model**: `claude-sonnet-4-5-20250929` via `EMERGENT_LLM_KEY` (streaming SSE).
- **Estrazione contenuti**: youtube-transcript-api, pypdf, python-docx, python-pptx, ebooklib,
  BeautifulSoup, pytesseract (OCR), Whisper (audio).

## Core Requirements (static)
1. **ONE BIG BAR** homepage per link + file + testo.
2. **Analisi automatica**: topic, concetti, prerequisiti, formule, esempi, collegamenti, mind map.
3. **Modalità Spiegazione**: 6 livelli (bambino, superiori, universitario, esperto, tecnico, semplice).
4. **Tutor streaming**: struttura didattica (intro, concetti, esempi, analogie, errori comuni, curiosità, collegamenti, riepilogo).
5. **Comprensione attiva**: bar "Hai capito?" — se NO, cambia metodo automaticamente.
6. **Quiz intelligenti**: multiple choice, V/F, aperte, flashcard.
7. **Metodo Feynman**: valutazione della spiegazione dell'utente con feedback.
8. **Mappa concettuale** automatica.
9. **Piano di studio** con ripetizione dilazionata.
10. **Dashboard**: livello, ore studiate, comprensione media, punti deboli, argomenti padroneggiati.

## What's Been Implemented — 2026-02-13
- ✅ Backend API completa: /ingest/url, /ingest/file, /session/*, /lesson/intro (SSE),
  /chat (SSE), /quiz, /feynman, /plan, /progress, /notes, /dashboard.
- ✅ Estrazione da: YouTube (transcript-api), URL web (BeautifulSoup), PDF, DOCX, PPTX,
  EPUB, testo, immagini (OCR con Tesseract), audio (Whisper).
- ✅ Streaming Claude Sonnet 4.5 con emergentintegrations.
- ✅ Frontend: Home (ONE BIG BAR + drag&drop + level selector),
  Classroom (3-pane: chapters / chat streaming / mind-map/quiz/feynman/plan/notes),
  Dashboard (stats bento).
- ✅ Metodo Feynman con scoring, mind map rendering, quiz interattivo con correzione,
  bar "Hai capito?" che cambia approccio se l'utente dice No.
- ✅ Design "Old Money Tech / Academic": Warm Cream + Deep Ink + Academic Emerald, EB
  Garamond + Manrope, grain overlay, marquee formats.
- ✅ Testing (iterations 1 & 2): backend 100%, frontend 100% (16/16 UI checks).

## Prioritized Backlog

### P0 (already done)
- All core flow above.

### P1 (next)
- **Multi-lingua** (attualmente hard-coded IT; aggiungere EN/ES/FR).
- **Streaming SSE anche per Feynman/Quiz/Plan** (attualmente sync JSON).
- **Modalità Maestro attiva**: notifiche push di ripetizione dilazionata programmata.
- **Salvataggio flashcard in un'app Anki-like** con schedule spaced repetition.
- **Autenticazione** (JWT o Emergent Google Auth) per persistere il percorso tra device.

### P2
- Supporto per cartelle multi-file zip.
- Esportazione lezione in PDF / Markdown.
- Vimeo / Spotify podcast trascrizione automatica.
- Grafici di comprensione nel tempo (recharts).
- Modalità collaborativa "aula virtuale condivisa".
- Voice mode: parla col Maestro in audio.

## Environment
- `EMERGENT_LLM_KEY` in /app/backend/.env (universal key)
- `MONGO_URL`, `DB_NAME` preserved from template
- Tesseract OCR installed via apt (tesseract-ocr)
- `REACT_APP_BACKEND_URL` in /app/frontend/.env

## Known Constraints
- **Emergent LLM Key concurrency**: free tier = 1 parallel LLM call. Il backend restituisce
  429 con messaggio in italiano quando si supera; il frontend mostra un toast.
- **Streaming Claude**: talvolta 30-60s per una lezione lunga (previsto).
