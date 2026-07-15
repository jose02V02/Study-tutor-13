import os
import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

# Assicuriamoci che il backend sia importabile
import sys
from pathlib import Path
ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from server import app as fastapi_app

# Crea un'app wrapper (opzionale ma pulito)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/", fastapi_app)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
