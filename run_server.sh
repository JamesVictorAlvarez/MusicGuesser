#!/bin/bash
# Run the FastAPI Music Guesser server
source server_venv/bin/activate
python3 server/main.py "$@"
