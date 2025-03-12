# MindToEye Migration Status

## Migration Progress

- [x] Created Flask backend structure (app.py, routes.py, etc.)
- [x] Implemented storage module (storage.py)
- [x] Created schema validation module (schema.py)
- [x] Set up configuration system (config.py)
- [x] Implemented AI helpers for Claude and FLUX (ai_helpers.py)
- [x] Set up API endpoints for all required functionality
- [x] Added WSGI file for production deployment (wsgi.py)
- [x] Express server running successfully on port 5000
- [ ] Flask server running successfully on port 5001 (pending workflow configuration)
- [ ] Transition API calls from Express to Flask

## Current State

The application currently uses the Express server on port 5000 for serving the React frontend and API endpoints. We're in the process of migrating the backend functionality to a Flask server that will run on port 5001.

## How to Run

### Express Server (Port 5000)
```
npm run dev
```

### Flask Server (Port 5001)
```
./run_flask_server.sh
```

## Testing

You can test the Flask API using the provided test script:

```
python test_flask_api.py
```

## Next Steps

1. Start the Flask server as a persistent workflow
2. Test all API endpoints on the Flask server
3. Update the frontend to call the Flask API instead of Express
4. Remove duplicate functionality from Express as it's confirmed in Flask