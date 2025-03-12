#!/usr/bin/env python3
"""
Script to run the Flask API server
"""
import os
import logging
import sys
from app import create_app

# Configure logging to file and console
log_file = 'flask_server.log'
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    try:
        # Create and run the Flask app
        app = create_app()
        port = int(os.environ.get('FLASK_PORT', 5001))
        host = '0.0.0.0'
        
        # Log startup information
        logger.info(f"==============================")
        logger.info(f"Starting Flask API server on {host}:{port}")
        logger.info(f"Debug mode: {os.environ.get('FLASK_DEBUG', 'True')}")
        logger.info(f"Log file: {os.path.abspath(log_file)}")
        logger.info(f"==============================")
        
        # Run the Flask app
        app.run(host=host, port=port, debug=True)
    except Exception as e:
        logger.exception(f"Failed to start Flask server: {e}")
        sys.exit(1)