import sys
import os
from pathlib import Path

# Add the backend directory to sys.path so its modules can be imported normally
ROOT_DIR = Path(__file__).parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# Now import the FastAPI app from backend.server
from server import app
