# MindToEye: AI-Powered Brand Concept Visualization Platform

MindToEye is a powerful brand concept visualization platform that empowers creative professionals to rapidly generate, iterate, and present unique brand identities through intelligent design tools and collaborative workflows.

## Architecture Overview

The application consists of two main components:

1. **Express Server** (Port 5000): The original Node.js backend that serves the React frontend and provides API endpoints
2. **Flask Server** (Port 5001): The new Python backend that handles AI integration with Claude and FLUX

The application is currently in a transitional state, with functionality being migrated from Express to Flask.

## Setup and Development

### Running the Express Server

The Express server runs on port 5000 and is configured with the "Start application" workflow:

```
npm run dev
```

### Running the Flask Server

The Flask server runs on port 5001:

```
python app.py
```

### Environment Variables

The following environment variables need to be set for the Flask server:

- `ANTHROPIC_API_KEY` - API key for Claude
- `OPENAI_API_KEY` - API key for OpenAI
- `REPLICATE_API_TOKEN` - API token for Replicate (FLUX)

### Testing the Flask API

You can test the Flask API using the provided test script:

```
python test_flask_api.py
```

## Key Features

- AI-assisted design generation (Claude 3.5 Sonnet + Black Forest Labs Flux)
- Interactive visualization components
- Real-time collaborative design editing
- Replicate AI integration for logo generation
- Selective regeneration of design elements
- Advanced error handling and keyword-based AI fallbacks
- Dynamic element regeneration with contextual AI support

## Key Technologies

- React TypeScript frontend
- Node.js/Express backend (being migrated)
- Flask Python backend (in progress)
- Claude 3.5 Sonnet for brand concept generation
- Black Forest Labs Flux for logo generation
- In-memory storage with optional persistence
- RESTful API with streaming capabilities