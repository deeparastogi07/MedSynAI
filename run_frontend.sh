#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  Starting MedSynAI Frontend (React + Vite)"
echo "========================================================"

cd "$(dirname "$0")/frontend"

if ! command -v npm &> /dev/null; then
    echo ""
    echo "[ERROR] npm could not be found on PATH."
    echo "Please install Node.js (LTS version) from https://nodejs.org/"
    echo ""
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[INFO] node_modules not found. Installing frontend dependencies..."
    npm install
fi

echo ""
echo "[INFO] Starting Vite dev server at http://localhost:5173 ..."
npm run dev
