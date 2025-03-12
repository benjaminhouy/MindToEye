"""Flask application for MindToEye"""
from flask import Flask, send_from_directory, jsonify
import os
import logging
import anthropic
import openai
import replicate
from routes import register_routes
from storage import MemStorage
from config import get_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

def create_app(config=None):
    """Create and configure the Flask application"""
    app = Flask(__name__, static_folder="client/dist")
    
    # Load configuration
    app_config = config or get_config()
    app.config.from_object(app_config)
    
    # Configure CORS
    if app.config.get("CORS_ORIGINS"):
        from flask_cors import CORS
        CORS(app, origins=app.config["CORS_ORIGINS"])
    
    # Initialize storage
    storage = MemStorage()
    
    # Initialize AI clients
    try:
        anthropic_client = anthropic.Anthropic(api_key=app.config["ANTHROPIC_API_KEY"])
        logger.info("Anthropic client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Anthropic client: {e}")
        anthropic_client = None
    
    try:
        openai_client = openai.OpenAI(api_key=app.config["OPENAI_API_KEY"])
        logger.info("OpenAI client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client: {e}")
        openai_client = None
    
    try:
        replicate_client = replicate.Client(api_token=app.config["REPLICATE_API_TOKEN"])
        logger.info("Replicate client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Replicate client: {e}")
        replicate_client = None
    
    # Register API routes
    register_routes(app, storage, anthropic_client, openai_client, replicate_client)
    
    # Static file serving
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve(path):
        """Serve the React frontend"""
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")
    
    return app

if __name__ == "__main__":
    flask_app = create_app()
    config = get_config()
    
    logger.info(f"Starting Flask API server on {config.HOST}:{config.PORT}")
    flask_app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG
    )