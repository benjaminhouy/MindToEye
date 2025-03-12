import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import logging
import anthropic
import openai
import replicate
from storage import MemStorage
from config import get_config

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app(config=None):
    """Create and configure the Flask application"""
    
    # Initialize the app
    app = Flask(__name__, static_folder='client/dist')
    
    # Apply configuration
    if config is None:
        # Get the configuration based on the environment
        config = get_config()
    app.config.from_object(config)
    
    # Enable CORS
    CORS(app)
    
    # Initialize storage
    storage = MemStorage()
    
    # Initialize AI clients
    logger.info("Initializing AI clients...")
    anthropic_client = anthropic.Anthropic(api_key=app.config.get("ANTHROPIC_API_KEY"))
    openai_client = openai.OpenAI(api_key=app.config.get("OPENAI_API_KEY"))
    replicate_client = replicate.Client(api_token=app.config.get("REPLICATE_API_TOKEN"))
    
    # Import routes after app initialization to avoid circular imports
    from routes import register_routes
    
    # Register API routes
    register_routes(app, storage, anthropic_client, openai_client, replicate_client)
    
    # Serve React frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(app.static_folder + '/' + path):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')
    
    return app

# Create the application instance
app = create_app()

if __name__ == '__main__':
    # For development
    host = app.config.get('HOST', '0.0.0.0')
    port = app.config.get('PORT', 5000)
    debug = app.config.get('DEBUG', False)
    
    logger.info(f"Starting Flask server on {host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)