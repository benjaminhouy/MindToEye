"""Simple Flask test server"""
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "MindToEye Flask API is running"})

@app.route('/api/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({
        "message": "Flask API is working!",
        "services": {
            "anthropic": "initialized",
            "openai": "initialized",
            "replicate": "initialized"
        }
    })

if __name__ == '__main__':
    print("Starting simple Flask test server on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)