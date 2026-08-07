import sys
import os

# Add backend directory to sys.path so modules can be imported
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
if backend_path not in sys.path:
    sys.path.append(backend_path)

from main import app
