"""API routes for Flask application"""
from flask import request, jsonify, Response, stream_with_context
import logging
import json
import time
from typing import Dict, List, Any, Optional, Generator

from schema import (
    ProjectSchema, ProjectCreateSchema, 
    BrandConceptSchema, BrandConceptCreateSchema,
    BrandInputSchema, RegenerateElementSchema
)
from ai_helpers import generate_brand_concept, generate_logo, regenerate_element

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize schema instances
project_schema = ProjectSchema()
projects_schema = ProjectSchema(many=True)
project_create_schema = ProjectCreateSchema()

brand_concept_schema = BrandConceptSchema()
brand_concepts_schema = BrandConceptSchema(many=True)
brand_concept_create_schema = BrandConceptCreateSchema()

brand_input_schema = BrandInputSchema()
regenerate_element_schema = RegenerateElementSchema()

def register_routes(app, storage, anthropic_client, openai_client, replicate_client):
    """Register all API routes for the Flask application"""
    
    @app.route("/api/health", methods=["GET"])
    def health_check():
        """API health check endpoint"""
        return jsonify({
            "status": "ok",
            "services": {
                "anthropic": anthropic_client is not None,
                "openai": openai_client is not None,
                "replicate": replicate_client is not None
            }
        })
    
    @app.route("/api/projects", methods=["GET"])
    def get_projects():
        """Get all projects for a user"""
        # In a real app, we would get the user_id from authentication
        user_id = request.args.get("userId", 1, type=int)
        projects = storage.get_projects(user_id)
        return jsonify(projects)
    
    @app.route("/api/projects/<int:project_id>", methods=["GET"])
    def get_project(project_id):
        """Get a project by ID"""
        project = storage.get_project(project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404
        return jsonify(project)
    
    @app.route("/api/projects", methods=["POST"])
    def create_project():
        """Create a new project"""
        # Validate request data
        json_data = request.get_json()
        if not json_data:
            return jsonify({"error": "No input data provided"}), 400
        
        # In a real app, we would get the user_id from authentication
        if "userId" not in json_data:
            json_data["userId"] = 1
        
        try:
            # Validate with marshmallow
            data = project_create_schema.load(json_data)
            
            # Create project in storage
            project = storage.create_project(data)
            
            return jsonify(project), 201
        
        except Exception as e:
            logger.error(f"Error creating project: {str(e)}")
            return jsonify({"error": str(e)}), 400
    
    @app.route("/api/projects/<int:project_id>", methods=["DELETE"])
    def delete_project(project_id):
        """Delete a project"""
        success = storage.delete_project(project_id)
        if not success:
            return jsonify({"error": "Project not found"}), 404
        return jsonify({"success": True}), 200
    
    @app.route("/api/projects/<int:project_id>/concepts", methods=["GET"])
    def get_brand_concepts(project_id):
        """Get all brand concepts for a project"""
        project = storage.get_project(project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        concepts = storage.get_brand_concepts(project_id)
        return jsonify(concepts)
    
    @app.route("/api/concepts/<int:concept_id>", methods=["GET"])
    def get_brand_concept(concept_id):
        """Get a brand concept by ID"""
        concept = storage.get_brand_concept(concept_id)
        if not concept:
            return jsonify({"error": "Brand concept not found"}), 404
        return jsonify(concept)
    
    @app.route("/api/generate-concept", methods=["POST"])
    def generate_concept():
        """Generate a brand concept using Claude/Anthropic"""
        if not anthropic_client:
            return jsonify({"error": "Anthropic client not initialized"}), 500
        
        # Validate request data
        json_data = request.get_json()
        if not json_data:
            return jsonify({"error": "No input data provided"}), 400
        
        try:
            # Validate with marshmallow
            brand_input_schema.load(json_data)
            
            # Check if this is a streaming request
            stream = request.args.get("stream", "false").lower() == "true"
            
            if stream:
                # Streaming response
                def generate():
                    """Generator function for streaming response"""
                    # Send progress updates
                    yield json.dumps({"progress": 0.1, "status": "Starting generation"}) + "\n"
                    time.sleep(0.5)
                    
                    yield json.dumps({"progress": 0.3, "status": "Analyzing brand information"}) + "\n"
                    time.sleep(0.5)
                    
                    # Generate the concept
                    try:
                        brand_output = generate_brand_concept(json_data, anthropic_client)
                        yield json.dumps({"progress": 0.7, "status": "Creating logo variations"}) + "\n"
                        time.sleep(0.5)
                        
                        yield json.dumps({"progress": 1.0, "status": "Complete", "data": brand_output}) + "\n"
                    
                    except Exception as e:
                        logger.error(f"Error in streaming generation: {str(e)}")
                        yield json.dumps({"error": str(e)}) + "\n"
                
                return Response(stream_with_context(generate()), mimetype="application/x-ndjson")
            
            else:
                # Non-streaming response
                brand_output = generate_brand_concept(json_data, anthropic_client)
                return jsonify(brand_output)
        
        except Exception as e:
            logger.error(f"Error generating concept: {str(e)}")
            return jsonify({"error": str(e)}), 400
    
    @app.route("/api/test-replicate", methods=["GET"])
    def test_replicate():
        """Test route for Replicate API with FLUX model"""
        if not replicate_client:
            return jsonify({"error": "Replicate client not initialized"}), 500
        
        try:
            # Run a simple FLUX test
            model = "stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478"
            output = replicate_client.run(
                model,
                input={"prompt": "a photo of a cat"}
            )
            
            return jsonify({"success": True, "output": output})
        
        except Exception as e:
            logger.error(f"Error testing Replicate: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/test-claude", methods=["POST"])
    def test_claude():
        """Test route for Claude concept generation"""
        if not anthropic_client:
            return jsonify({"error": "Anthropic client not initialized"}), 500
        
        try:
            # Validate request data
            json_data = request.get_json()
            if not json_data:
                return jsonify({"error": "No input data provided"}), 400
            
            # Generate a concept using Claude
            brand_output = generate_brand_concept(json_data, anthropic_client)
            return jsonify(brand_output)
        
        except Exception as e:
            logger.error(f"Error testing Claude: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/test-flux-logo", methods=["POST"])
    def test_flux_logo():
        """Test route for FLUX logo generation"""
        if not replicate_client:
            return jsonify({"error": "Replicate client not initialized"}), 500
        
        try:
            # Validate request data
            json_data = request.get_json()
            if not json_data:
                return jsonify({"error": "No input data provided"}), 400
            
            # Extract logo generation parameters
            brand_name = json_data.get("brandName", "Brand")
            industry = json_data.get("industry", "")
            description = json_data.get("description", "")
            values = json_data.get("values", [])
            design_style = json_data.get("designStyle", "modern")
            colors = json_data.get("colorPreferences", [])
            
            # Get value strings from the values list
            value_strings = [v["value"] for v in values] if isinstance(values, list) else []
            
            # Generate logo
            logo_svgs = generate_logo(
                brand_name=brand_name,
                industry=industry,
                description=description,
                values=value_strings,
                style=design_style,
                colors=colors,
                replicate_client=replicate_client
            )
            
            return jsonify({"logo": logo_svgs})
        
        except Exception as e:
            logger.error(f"Error testing FLUX logo: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/generate-logo", methods=["POST"])
    def generate_logo_route():
        """Generate logo or billboard using the FLUX AI model"""
        if not replicate_client:
            return jsonify({"error": "Replicate client not initialized"}), 500
        
        try:
            # Validate request data
            json_data = request.get_json()
            if not json_data:
                return jsonify({"error": "No input data provided"}), 400
            
            # Extract logo generation parameters
            brand_name = json_data.get("brandName", "Brand")
            industry = json_data.get("industry", "")
            description = json_data.get("description", "")
            values = json_data.get("values", [])
            design_style = json_data.get("designStyle", "modern")
            colors = json_data.get("colors", [])
            
            # Get value strings from the values list
            value_strings = [v["value"] for v in values] if isinstance(values, list) else []
            
            # Generate logo
            logo_svgs = generate_logo(
                brand_name=brand_name,
                industry=industry,
                description=description,
                values=value_strings,
                style=design_style,
                colors=colors,
                replicate_client=replicate_client
            )
            
            return jsonify({"logo": logo_svgs})
        
        except Exception as e:
            logger.error(f"Error generating logo: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/projects/<int:project_id>/concepts", methods=["POST"])
    def create_brand_concept(project_id):
        """Create a new brand concept for a project"""
        # Validate request data
        json_data = request.get_json()
        if not json_data:
            return jsonify({"error": "No input data provided"}), 400
        
        # Make sure the projectId is set correctly
        json_data["projectId"] = project_id
        
        try:
            # Validate with marshmallow
            data = brand_concept_create_schema.load(json_data)
            
            # Create concept in storage
            concept = storage.create_brand_concept(data)
            
            return jsonify(concept), 201
        
        except Exception as e:
            logger.error(f"Error creating brand concept: {str(e)}")
            return jsonify({"error": str(e)}), 400
    
    @app.route("/api/concepts/<int:concept_id>/set-active", methods=["PATCH"])
    def set_active_concept(concept_id):
        """Set a brand concept as active for its project"""
        concept = storage.get_brand_concept(concept_id)
        if not concept:
            return jsonify({"error": "Brand concept not found"}), 404
        
        project_id = concept["projectId"]
        success = storage.set_active_brand_concept(concept_id, project_id)
        
        if not success:
            return jsonify({"error": "Failed to set concept as active"}), 400
        
        # Return the updated concept
        updated_concept = storage.get_brand_concept(concept_id)
        return jsonify(updated_concept)
    
    @app.route("/api/concepts/<int:concept_id>", methods=["DELETE"])
    def delete_brand_concept(concept_id):
        """Delete a brand concept"""
        success = storage.delete_brand_concept(concept_id)
        if not success:
            return jsonify({"error": "Brand concept not found"}), 404
        return jsonify({"success": True}), 200
    
    @app.route("/api/regenerate-element", methods=["POST"])
    def regenerate_element_route():
        """Regenerate a specific element of a brand concept"""
        if not anthropic_client or not replicate_client:
            return jsonify({"error": "Required AI clients not initialized"}), 500
        
        # Validate request data
        json_data = request.get_json()
        if not json_data:
            return jsonify({"error": "No input data provided"}), 400
        
        try:
            # Validate with marshmallow
            data = regenerate_element_schema.load(json_data)
            
            concept_id = data["conceptId"]
            element_type = data["elementType"]
            
            # Get the concept
            concept = storage.get_brand_concept(concept_id)
            if not concept:
                return jsonify({"error": "Brand concept not found"}), 404
            
            # Regenerate the element
            regenerated_element = regenerate_element(
                concept=concept,
                element_type=element_type,
                anthropic_client=anthropic_client,
                replicate_client=replicate_client
            )
            
            # Update the concept with the regenerated element
            if element_type == "colors":
                storage.update_brand_concept(concept_id, {
                    "brandOutput": {"colors": regenerated_element}
                })
            elif element_type == "typography":
                storage.update_brand_concept(concept_id, {
                    "brandOutput": {"typography": regenerated_element}
                })
            elif element_type == "logo":
                storage.update_brand_concept(concept_id, {
                    "brandOutput": {"logo": regenerated_element}
                })
            elif element_type == "tagline":
                storage.update_brand_concept(concept_id, {
                    "brandOutput": {"tagline": regenerated_element}
                })
            
            # Return the updated concept
            updated_concept = storage.get_brand_concept(concept_id)
            return jsonify(updated_concept)
        
        except Exception as e:
            logger.error(f"Error regenerating element: {str(e)}")
            return jsonify({"error": str(e)}), 400