"""Flask application for MindToEye"""
from flask import Flask, send_from_directory, Blueprint
from flask_cors import CORS
import os
import logging
import anthropic
import openai
import replicate
from config import get_config
from storage import MemStorage
from routes import register_routes

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app(config=None):
    """Create and configure the Flask application"""
    app = Flask(__name__, static_folder='client/dist')
    
    # Load configuration
    if config is None:
        config = get_config()
    app.config.from_object(config)
    
    # Enable CORS
    CORS(app)
    
    # Initialize storage
    storage = MemStorage()
    
    # Initialize AI clients
    anthropic_client = anthropic.Anthropic(api_key=app.config['ANTHROPIC_API_KEY'])
    openai_client = openai.OpenAI(api_key=app.config['OPENAI_API_KEY'])
    replicate_client = replicate.Client(api_token=app.config['REPLICATE_API_TOKEN'])
    
    # Register API routes
    register_routes(app, storage, anthropic_client, openai_client, replicate_client)
    
    # Serve the React frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        """Serve the React frontend"""
        if path != "" and os.path.exists(app.static_folder + '/' + path):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')
    
    return app

# Create the Flask application
app = create_app()

if __name__ == '__main__':
    # Run the Flask application
    port = app.config.get('PORT', 5000)
    host = app.config.get('HOST', '0.0.0.0')
    
    logger.info(f"Starting Flask server on {host}:{port}")
    app.run(host=host, port=port, debug=app.config.get('DEBUG', False))