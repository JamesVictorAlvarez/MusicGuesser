import os
from dotenv import load_dotenv

load_dotenv()

# Server configuration
PORT = int(os.getenv('PORT', 3001))
HOST = os.getenv('HOST', '0.0.0.0')
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

# CORS configuration for python-socketio
# For development: allow all origins
# For production: specify explicit origins
if DEBUG:
    CORS_ORIGINS = '*'
else:
    CORS_ORIGINS = [
        'http://localhost:5173',  # Vite default dev server
        'http://localhost:3000',  # Alternative frontend port
        'http://localhost:5000',  # Alternative frontend port
    ]
    
    # Allow CORS from environment variable (useful for production)
    CORS_ORIGINS_ENV = os.getenv('CORS_ORIGINS', '')
    if CORS_ORIGINS_ENV:
        CORS_ORIGINS.extend(CORS_ORIGINS_ENV.split(','))
