"""inteligent STUDY - Backend FastAPI server."""
import os
import uuid
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from content_extractor import extract_from_url, extract_from_file
from exporter import export_session, FORMAT_CONFIG
from ai_service import (
    analyze_content,
    generate_lesson_intro,
    tutor_reply,
    generate_quiz,
    feynman_review,
    generate_study_plan,
)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="inteligent STUDY API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("study")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ==== MODELS ====
class IngestUrlRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None
    level: str = "universitario"


class ChatRequest(BaseModel):
    session_id: str
    message: str
    level: str = "universitario"


class FeynmanRequest(BaseModel):
    session_id: str
    explanation: str
    level: str = "universitario"


class ProgressUpdate(BaseModel):
    session_id: str
    chapter_index: Optional[int] = None
    comprehension: Optional[float] = None
    weak_topic: Optional[str] = None
    minutes_studied: Optional[int] = None
    understood: Optional[bool] = None
    misunderstood_topic: Optional[str] = None


class NoteCreate(BaseModel):
    session_id: str
    text: str


# ==== HELPERS ====
async def _create_session(analysis: dict, source: dict, level: str) -> str:
    sid = str(uuid.uuid4())
    doc = {
        "id": sid,
        "title": analysis.get("topic", source.get("title", "Lezione")),
        "level": level,
        "source": {
            "type": source["source_type"],
            "title": source["title"],
            "text_preview": source["text"][:2000],
        },
        "analysis": analysis,
        "created_at": _now_iso(),
        "messages": [],
        "quiz": None,
        "notes": [],
        "progress": {
            "current_chapter": 0,
            "chapters_completed": [],
            "comprehension": 0,
            "weak_topics": [],
            "understood_topics": [],
            "minutes_studied": 0,
            "hai_capito_no_count": 0,
        },
    }
    await db.sessions.insert_one(doc)
    return sid


async def _get_session(sid: str) -> dict:
    doc = await db.sessions.find_one({"id": sid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Sessione non trovata")
    return doc


# ==== ROUTES ====
@api_router.get("/")
async def root():
    return {"message": "inteligent STUDY API", "version": "1.0.0"}


@api_router.post("/ingest/url")
async def ingest_url(req: IngestUrlRequest):
    if req.text and req.text.strip():
        source = {"text": req.text, "source_type": "text", "title": "Testo incollato"}
    elif req.url and req.url.strip():
        try:
            source = extract_from_url(req.url)
        except Exception as e:
            raise HTTPException(400, f"Impossibile estrarre contenuto: {e}")
    else:
        raise HTTPException(400, "Fornire url o text")

    if not source["text"] or len(source["text"].strip()) < 50:
        raise HTTPException(400, "Contenuto estratto troppo corto o vuoto")

    try:
        analysis = await analyze_content(EMERGENT_LLM_KEY, source["text"], source["title"])
    except Exception as e:
        logger.exception("analyze failed")
        msg = str(e)
        if "CONCURRENCY_REQUEST_LIMIT" in msg or "429" in msg:
            raise HTTPException(429, "Troppe richieste contemporaneamente. Attendi qualche secondo e riprova.")
        raise HTTPException(500, f"Analisi AI fallita: {e}")

    sid = await _create_session(analysis, source, req.level)
    return {"session_id": sid, "analysis": analysis, "title": analysis.get("topic")}


@api_router.post("/ingest/file")
async def ingest_file(file: UploadFile = File(...), level: str = Form("universitario")):
    data = await file.read()
    try:
        source = extract_from_file(file.filename, data, EMERGENT_LLM_KEY)
    except Exception as e:
        raise HTTPException(400, f"Estrazione file fallita: {e}")

    if not source["text"] or len(source["text"].strip()) < 50:
        raise HTTPException(400, "Contenuto estratto troppo corto o vuoto")

    try:
        analysis = await analyze_content(EMERGENT_LLM_KEY, source["text"], source["title"])
    except Exception as e:
        logger.exception("analyze failed")
        msg = str(e)
        if "CONCURRENCY_REQUEST_LIMIT" in msg or "429" in msg:
            raise HTTPException(429, "Troppe richieste contemporaneamente. Attendi qualche secondo e riprova.")
        raise HTTPException(500, f"Analisi AI fallita: {e}")

    sid = await _create_session(analysis, source, level)
    return {"session_id": sid, "analysis": analysis, "title": analysis.get("topic")}


@api_router.get("/session/{sid}")
async def get_session(sid: str):
    return await _get_session(sid)


@api_router.get("/sessions")
async def list_sessions():
    docs = await db.sessions.find({}, {"_id": 0, "messages": 0, "source.text_preview": 0}).sort("created_at", -1).to_list(200)
    return {"sessions": docs}


@api_router.delete("/session/{sid}")
async def delete_session(sid: str):
    res = await db.sessions.delete_one({"id": sid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Sessione non trovata")
    return {"ok": True}


@api_router.get("/lesson/intro/{sid}")
async def lesson_intro(sid: str):
    session = await _get_session(sid)

    async def gen():
        buf = ""
        try:
            async for chunk in generate_lesson_intro(EMERGENT_LLM_KEY, sid, session["analysis"], session["level"]):
                buf += chunk
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
            await db.sessions.update_one(
                {"id": sid},
                {"$push": {"messages": {"role": "assistant", "content": buf, "ts": _now_iso()}}},
            )
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            logger.exception("lesson_intro error")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_router.post("/chat")
async def chat(req: ChatRequest):
    session = await _get_session(req.session_id)
    history = session.get("messages", [])

    await db.sessions.update_one(
        {"id": req.session_id},
        {"$push": {"messages": {"role": "user", "content": req.message, "ts": _now_iso()}}},
    )

    async def gen():
        buf = ""
        try:
            async for chunk in tutor_reply(
                EMERGENT_LLM_KEY, req.session_id, req.message, session["analysis"], req.level, history
            ):
                buf += chunk
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
            await db.sessions.update_one(
                {"id": req.session_id},
                {"$push": {"messages": {"role": "assistant", "content": buf, "ts": _now_iso()}}},
            )
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            logger.exception("chat error")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_router.post("/quiz/{sid}")
async def quiz_generate(sid: str):
    session = await _get_session(sid)

    async def gen():
        result = None
        try:
            async for kind, payload in generate_quiz(EMERGENT_LLM_KEY, session["analysis"], session["level"]):
                if kind == "delta":
                    yield f"data: {json.dumps({'delta': payload})}\n\n"
                elif kind == "result":
                    result = payload
            if result is not None:
                await db.sessions.update_one({"id": sid}, {"$set": {"quiz": result}})
                yield f"data: {json.dumps({'done': True, 'data': result})}\n\n"
        except Exception as e:
            logger.exception("quiz error")
            msg = str(e)
            if "CONCURRENCY_REQUEST_LIMIT" in msg or "429" in msg:
                yield f"data: {json.dumps({'error': 'Troppe richieste. Riprova tra qualche secondo.'})}\n\n"
            else:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api_router.post("/feynman")
async def feynman(req: FeynmanRequest):
    session = await _get_session(req.session_id)

    async def gen():
        result = None
        try:
            async for kind, payload in feynman_review(EMERGENT_LLM_KEY, session["analysis"], req.explanation, req.level):
                if kind == "delta":
                    yield f"data: {json.dumps({'delta': payload})}\n\n"
                elif kind == "result":
                    result = payload
            if result is not None:
                yield f"data: {json.dumps({'done': True, 'data': result})}\n\n"
        except Exception as e:
            logger.exception("feynman error")
            msg = str(e)
            if "CONCURRENCY_REQUEST_LIMIT" in msg or "429" in msg:
                yield f"data: {json.dumps({'error': 'Troppe richieste. Riprova tra qualche secondo.'})}\n\n"
            else:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api_router.get("/plan/{sid}")
async def study_plan(sid: str):
    session = await _get_session(sid)
    p = session.get("progress", {})

    async def gen():
        result = None
        try:
            async for kind, payload in generate_study_plan(
                EMERGENT_LLM_KEY, session["analysis"], p.get("comprehension", 0), p.get("weak_topics", [])
            ):
                if kind == "delta":
                    yield f"data: {json.dumps({'delta': payload})}\n\n"
                elif kind == "result":
                    result = payload
            if result is not None:
                await db.sessions.update_one({"id": sid}, {"$set": {"study_plan": result}})
                yield f"data: {json.dumps({'done': True, 'data': result})}\n\n"
        except Exception as e:
            logger.exception("plan error")
            msg = str(e)
            if "CONCURRENCY_REQUEST_LIMIT" in msg or "429" in msg:
                yield f"data: {json.dumps({'error': 'Troppe richieste. Riprova tra qualche secondo.'})}\n\n"
            else:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api_router.post("/progress")
async def update_progress(u: ProgressUpdate):
    session = await _get_session(u.session_id)
    p = session.get("progress", {})
    upd = {}
    if u.chapter_index is not None:
        p["current_chapter"] = u.chapter_index
        completed = set(p.get("chapters_completed", []))
        completed.add(u.chapter_index)
        p["chapters_completed"] = sorted(completed)
    if u.comprehension is not None:
        p["comprehension"] = u.comprehension
    if u.minutes_studied is not None:
        p["minutes_studied"] = p.get("minutes_studied", 0) + u.minutes_studied
    if u.weak_topic:
        weak = set(p.get("weak_topics", []))
        weak.add(u.weak_topic)
        p["weak_topics"] = sorted(weak)
    if u.understood is not None:
        if u.understood:
            und = set(p.get("understood_topics", []))
            if u.misunderstood_topic:
                und.add(u.misunderstood_topic)
            p["understood_topics"] = sorted(und)
        else:
            p["hai_capito_no_count"] = p.get("hai_capito_no_count", 0) + 1
            if u.misunderstood_topic:
                weak = set(p.get("weak_topics", []))
                weak.add(u.misunderstood_topic)
                p["weak_topics"] = sorted(weak)
    await db.sessions.update_one({"id": u.session_id}, {"$set": {"progress": p}})
    return p


@api_router.post("/notes")
async def add_note(n: NoteCreate):
    note = {"id": str(uuid.uuid4()), "text": n.text, "ts": _now_iso()}
    await db.sessions.update_one({"id": n.session_id}, {"$push": {"notes": note}})
    return note


@api_router.get("/dashboard")
async def dashboard():
    docs = await db.sessions.find({}, {"_id": 0}).to_list(500)
    total_sessions = len(docs)
    total_minutes = sum(d.get("progress", {}).get("minutes_studied", 0) for d in docs)
    chapters_completed = sum(len(d.get("progress", {}).get("chapters_completed", [])) for d in docs)
    comprehension_values = [d.get("progress", {}).get("comprehension", 0) for d in docs if d.get("progress", {}).get("comprehension", 0)]
    avg_comprehension = round(sum(comprehension_values) / len(comprehension_values), 1) if comprehension_values else 0
    weak_topics = []
    understood_topics = []
    recent = []
    for d in docs:
        weak_topics.extend(d.get("progress", {}).get("weak_topics", []))
        understood_topics.extend(d.get("progress", {}).get("understood_topics", []))
        recent.append({
            "id": d["id"],
            "title": d.get("title"),
            "level": d.get("level"),
            "created_at": d.get("created_at"),
            "comprehension": d.get("progress", {}).get("comprehension", 0),
            "chapters_total": len(d.get("analysis", {}).get("chapters", [])),
            "chapters_completed": len(d.get("progress", {}).get("chapters_completed", [])),
        })
    recent.sort(key=lambda x: x["created_at"] or "", reverse=True)

    # Livello: basato su ore studiate
    hours = total_minutes / 60
    if hours < 1:
        level_name = "Novizio"
    elif hours < 5:
        level_name = "Apprendista"
    elif hours < 15:
        level_name = "Studente"
    elif hours < 40:
        level_name = "Studioso"
    else:
        level_name = "Maestro"

    return {
        "total_sessions": total_sessions,
        "total_minutes": total_minutes,
        "hours_studied": round(hours, 1),
        "chapters_completed": chapters_completed,
        "avg_comprehension": avg_comprehension,
        "level_name": level_name,
        "weak_topics": list(set(weak_topics))[:10],
        "understood_topics": list(set(understood_topics))[:10],
        "recent_sessions": recent[:10],
    }


@api_router.get("/export/{sid}/{fmt}")
async def export_lesson(sid: str, fmt: str):
    """Esporta la sessione nel formato richiesto: txt, md, json, docx, pdf."""
    if fmt not in FORMAT_CONFIG:
        raise HTTPException(400, f"Formato non supportato. Disponibili: {', '.join(FORMAT_CONFIG)}")
    session = await _get_session(sid)
    try:
        data, ct, filename = export_session(session, fmt)
    except Exception as e:
        logger.exception("export failed")
        raise HTTPException(500, f"Errore export: {e}")
    from urllib.parse import quote
    return Response(
        content=data,
        media_type=ct,
        headers={
            "Content-Disposition": f'attachment; filename="{quote(filename)}"; filename*=UTF-8\'\'{quote(filename)}',
            "Cache-Control": "no-store",
        },
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
