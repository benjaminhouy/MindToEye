"""Configuration module for Flask application"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

class Config:
    """Base configuration"""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-dev-key')
    
    # CORS settings
    CORS_ORIGINS = ['*']
    
    # API keys
    ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    REPLICATE_API_TOKEN = os.environ.get('REPLICATE_API_TOKEN')
    
    # Server settings
    PORT = int(os.environ.get('PORT', 5001))
    HOST = os.environ.get('HOST', '0.0.0.0')
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    """Production configuration"""
    # Production-specific settings
    LOG_LEVEL = 'WARNING'
    
    # In production, warn if no secure secret key is set
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-insecure-key')
    if SECRET_KEY == 'default-insecure-key':
        import warnings
        warnings.warn("No SECRET_KEY set for production environment! Using insecure default.")

def get_config():
    """Get the current configuration based on environment"""
    env = os.environ.get('FLASK_ENV', 'development').lower()
    
    if env == 'production':
        return ProductionConfig()
    elif env == 'testing':
        return TestingConfig()
    else:
        return DevelopmentConfig()