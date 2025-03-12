#!/usr/bin/env python3
"""
Script to run the Flask API server
"""
import os
import logging
from app import create_app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    # Create and run the Flask app
    app = create_app()
    port = int(os.environ.get('FLASK_PORT', 5001))
    logger.info(f"Starting Flask API server on 0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)