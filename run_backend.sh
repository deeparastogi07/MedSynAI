#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  Starting MedSynAI Backend Server (FastAPI)"
echo "========================================================"

cd "$(dirname "$0")/backend"

if ! command -v python3 &> /dev/null; then
    echo ""
    echo "[ERROR] python3 could not be found on PATH."
    echo "Please install Python 3.10+ (e.g. brew install python3 or apt-get install python3 python3-venv)."
    echo ""
    exit 1
fi

if [ ! -d ".venv" ]; then
    echo "[INFO] Virtual environment .venv not found. Creating..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

echo ""
echo "[INFO] Launching FastAPI backend at http://localhost:8000 ..."
python -m uvicorn app:app --reload --port 8000
