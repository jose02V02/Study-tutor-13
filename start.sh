#!/bin/bash
pip3 install -r backend/requirements.txt
cd backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 3000
