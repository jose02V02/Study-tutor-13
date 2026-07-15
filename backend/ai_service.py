"""AI service for inteligent STUDY - Google Gemini via google-genai SDK."""
import json
import re
import uuid
from typing import AsyncGenerator

from google import genai
from google.genai import types


GEMINI_MODEL = "gemini-2.0-flash"


def _client(api_key: str) -> genai.Client:
    return genai.Client(api_key=api_key)


LEVEL_INSTRUCTIONS = {
    "bambino": "Spiega come se parlassi a un bambino di 10 anni. Usa parole molto semplici, analogie concrete della vita quotidiana, storie e immagini mentali.",
    "superiori": "Spiega al livello di uno studente delle scuole superiori. Sii chiaro, usa esempi pratici, evita gergo eccessivo.",
    "universitario": "Spiega al livello di uno studente universitario. Sii rigoroso ma didattico, includi definizioni formali e connessioni.",
    "esperto": "Spiega al livello di un esperto del settore. Usa terminologia tecnica appropriata, densità concettuale alta.",
    "tecnico": "Usa linguaggio tecnico specialistico. Precisione terminologica massima.",
    "semplice": "Usa linguaggio semplicissimo, frasi brevi, zero gergo.",
}


async def analyze_content(api_key: str, content: str, title: str) -> dict:
    """Analizza il contenuto ed estrae struttura didattica."""
    system = (
        "Sei un esperto pedagogista che analizza contenuti didattici in italiano. "
        "Rispondi SEMPRE con JSON valido, senza commenti né markdown."
    )
    prompt = f"""Analizza il seguente contenuto e produci un JSON con QUESTA struttura ESATTA:

{{
  "topic": "argomento principale (max 8 parole)",
  "summary": "riassunto breve del contenuto (2-3 frasi)",
  "difficulty": "principiante | intermedio | avanzato",
  "estimated_minutes": numero intero,
  "prerequisites": ["prerequisito 1", "prerequisito 2"],
  "concepts": [
    {{"name": "concetto", "definition": "definizione breve", "importance": "alta|media|bassa"}}
  ],
  "chapters": [
    {{"title": "titolo capitolo", "key_points": ["punto1", "punto2"], "objective": "cosa l'utente imparerà"}}
  ],
  "formulas": ["formula 1"],
  "examples": ["esempio 1"],
  "connections": ["collegamento ad altri argomenti"],
  "mind_map": {{
    "root": "concetto centrale",
    "branches": [
      {{"label": "ramo1", "children": ["sotto1", "sotto2"]}}
    ]
  }}
}}

Titolo: {title}

Contenuto:
{content[:15000]}

Rispondi SOLO con il JSON."""

    client = _client(api_key)
    response = await client.aio.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.2,
        ),
    )
    return _parse_json(response.text)


async def generate_lesson_intro(
    api_key: str, session_id: str, analysis: dict, level: str
) -> AsyncGenerator[str, None]:
    """Genera la prima lezione introduttiva (streaming)."""
    system = _tutor_system(level, analysis)
    prompt = f"""Inizia la prima lezione sul primo capitolo: "{analysis['chapters'][0]['title']}".
Struttura la spiegazione così:
1. **Introduzione** (aggancio, perché è importante)
2. **Concetti base** (definizioni essenziali)
3. **Esempio pratico** concreto
4. **Analogia** memorabile
5. **Errori comuni** da evitare
6. **Curiosità**
7. **Collegamento** con altri argomenti
8. **Riepilogo** finale

Alla fine, chiedi: "Hai capito? Rispondi Sì per continuare, No per una spiegazione diversa."
Usa markdown. Sii chiaro e coinvolgente."""

    client = _client(api_key)
    async for chunk in client.aio.models.generate_content_stream(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(system_instruction=system),
    ):
        if chunk.text:
            yield chunk.text


async def tutor_reply(
    api_key: str,
    session_id: str,
    user_message: str,
    analysis: dict,
    level: str,
    history: list,
) -> AsyncGenerator[str, None]:
    """Risposta del tutor con contesto della conversazione."""
    system = _tutor_system(level, analysis)
    hist_text = ""
    for m in history[-8:]:
        role = "Utente" if m["role"] == "user" else "Tutor"
        hist_text += f"\n{role}: {m['content'][:800]}"

    prompt = f"""Cronologia recente:{hist_text}

Nuovo messaggio dell'utente: {user_message}

Rispondi come tutor esperto. Se l'utente dice che non ha capito, CAMBIA metodo: usa un'analogia diversa, un esempio nuovo, semplifica ulteriormente. Non ripetere le stesse parole. Alla fine di una spiegazione completa, chiedi "Hai capito?"."""

    client = _client(api_key)
    async for chunk in client.aio.models.generate_content_stream(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(system_instruction=system),
    ):
        if chunk.text:
            yield chunk.text


async def _stream_json(
    api_key: str, system: str, prompt: str
) -> AsyncGenerator[tuple, None]:
    """Yields ('delta', chunk) then ('result', parsed_dict)."""
    client = _client(api_key)
    text = ""
    async for chunk in client.aio.models.generate_content_stream(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.1,
        ),
    ):
        if chunk.text:
            text += chunk.text
            yield ("delta", chunk.text)
    yield ("result", _parse_json(text))


async def generate_quiz(
    api_key: str, analysis: dict, level: str
) -> AsyncGenerator[tuple, None]:
    """Genera un quiz completo (streaming)."""
    system = "Sei un esperto pedagogista italiano. Rispondi SOLO con JSON valido."
    prompt = f"""Genera un quiz completo sull'argomento "{analysis['topic']}" al livello: {level}.

Concetti chiave: {json.dumps([c['name'] for c in analysis.get('concepts', [])], ensure_ascii=False)}

Produci JSON:
{{
  "multiple_choice": [
    {{"question":"...", "options":["a","b","c","d"], "correct_index":0, "explanation":"..."}}
  ],
  "true_false": [
    {{"statement":"...", "answer": true, "explanation":"..."}}
  ],
  "open_questions": [
    {{"question":"...", "sample_answer":"...", "key_points":["...","..."]}}
  ],
  "flashcards": [
    {{"front":"...", "back":"..."}}
  ]
}}

Genera 5 multiple_choice, 4 true_false, 3 open_questions, 6 flashcards. SOLO JSON."""
    async for ev in _stream_json(api_key, system, prompt):
        yield ev


async def feynman_review(
    api_key: str, analysis: dict, user_explanation: str, level: str
) -> AsyncGenerator[tuple, None]:
    system = "Sei un tutor esperto italiano che valuta con il metodo Feynman. Rispondi SOLO con JSON."
    prompt = f"""L'utente prova a spiegare l'argomento "{analysis['topic']}" con le sue parole.

Concetti che dovrebbe menzionare: {json.dumps([c['name'] for c in analysis.get('concepts', [])], ensure_ascii=False)}

Spiegazione dell'utente:
{user_explanation}

Produci JSON:
{{
  "score": numero 0-100,
  "missing": ["concetti mancanti"],
  "confused": ["punti confusi"],
  "review": ["cosa ripassare"],
  "feedback": "feedback dettagliato in 2-3 frasi",
  "strengths": ["punti forti"]
}}

SOLO JSON."""
    async for ev in _stream_json(api_key, system, prompt):
        yield ev


async def generate_study_plan(
    api_key: str, analysis: dict, comprehension: float, weak_topics: list
) -> AsyncGenerator[tuple, None]:
    system = "Sei un pianificatore didattico esperto. Rispondi SOLO con JSON."
    prompt = f"""Crea un piano di studio personalizzato.

Argomento: {analysis['topic']}
Difficoltà: {analysis.get('difficulty', 'intermedio')}
Comprensione attuale: {comprehension}%
Punti deboli: {json.dumps(weak_topics, ensure_ascii=False)}
Capitoli: {json.dumps([c['title'] for c in analysis.get('chapters', [])], ensure_ascii=False)}

JSON:
{{
  "review_topics": ["argomenti da ripassare"],
  "estimated_difficulty": "facile|media|alta",
  "study_time_minutes": numero,
  "current_level": "principiante|intermedio|avanzato",
  "next_topics": ["prossimi argomenti consigliati"],
  "spaced_repetition_schedule": [
    {{"topic":"...", "review_after_days": 1}},
    {{"topic":"...", "review_after_days": 3}}
  ]
}}

SOLO JSON."""
    async for ev in _stream_json(api_key, system, prompt):
        yield ev


def _tutor_system(level: str, analysis: dict) -> str:
    level_instr = LEVEL_INSTRUCTIONS.get(level, LEVEL_INSTRUCTIONS["universitario"])
    return f"""Sei "Maestro", un tutor AI eccezionale che insegna in italiano.
Non riassumi: INSEGNI davvero, adattando la spiegazione fino a quando l'utente comprende.

REGOLE:
- {level_instr}
- Ogni argomento va spiegato con: introduzione → concetti base → esempi → analogie → errori comuni → curiosità → collegamenti → riepilogo.
- Fermati periodicamente e chiedi "Hai capito?".
- Se l'utente dice "No", NON ripetere: cambia metodo (nuova analogia, esempio diverso, semplifica).
- Usa markdown per chiarezza (grassetto, elenchi, titoli).
- Sii caloroso, incoraggiante, come un vero maestro.

CONTESTO DELL'ARGOMENTO:
- Titolo: {analysis.get('topic', '')}
- Riassunto: {analysis.get('summary', '')}
- Concetti chiave: {', '.join(c['name'] for c in analysis.get('concepts', [])[:8])}
- Prerequisiti: {', '.join(analysis.get('prerequisites', []))}
"""


def _parse_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text)
    text = re.sub(r"```$", "", text)
    text = text.strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        text = m.group(0)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        fixed = re.sub(r",\s*([}\]])", r"\1", text)
        return json.loads(fixed)
