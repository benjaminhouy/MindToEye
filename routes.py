from flask import Flask, request, jsonify, Response, stream_with_context
import json
import os
from datetime import datetime
import time
import logging
from typing import Dict, Any, List, Optional, Callable
from marshmallow import ValidationError
from schema import (
    project_schema, projects_schema, project_create_schema,
    brand_concept_schema, brand_concepts_schema, brand_concept_create_schema,
    brand_input_schema, regenerate_element_schema
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def register_routes(app, storage, anthropic_client, openai_client, replicate_client):
    """Register all API routes for the Flask application"""
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """API health check endpoint"""
        return jsonify({"status": "ok"})
    
    # Project routes
    @app.route('/api/projects', methods=['GET'])
    def get_projects():
        """Get all projects for a user"""
        try:
            # For demo purposes, always use user ID 1
            user_id = 1
            projects = storage.get_projects(user_id)
            return jsonify(projects)
        except Exception as e:
            logger.error(f"Error fetching projects: {e}")
            return jsonify({"error": "Failed to fetch projects"}), 500
    
    @app.route('/api/projects/<int:project_id>', methods=['GET'])
    def get_project(project_id):
        """Get a project by ID"""
        try:
            project = storage.get_project(project_id)
            if not project:
                return jsonify({"error": "Project not found"}), 404
            return jsonify(project)
        except Exception as e:
            logger.error(f"Error fetching project {project_id}: {e}")
            return jsonify({"error": "Failed to fetch project"}), 500
    
    @app.route('/api/projects', methods=['POST'])
    def create_project():
        """Create a new project"""
        try:
            # For demo purposes, always use user ID 1
            user_id = 1
            
            project_data = request.json
            project_data["userId"] = user_id
            
            # Validate project data using schema
            try:
                validated_data = project_create_schema.load(project_data)
            except ValidationError as err:
                logger.error(f"Validation error: {err.messages}")
                return jsonify({"error": "Invalid project data", "details": err.messages}), 400
            
            project = storage.create_project(validated_data)
            return jsonify(project_schema.dump(project)), 201
        except Exception as e:
            logger.error(f"Error creating project: {e}")
            return jsonify({"error": "Failed to create project"}), 500
    
    @app.route('/api/projects/<int:project_id>', methods=['DELETE'])
    def delete_project(project_id):
        """Delete a project"""
        try:
            project = storage.get_project(project_id)
            if not project:
                return jsonify({"error": "Project not found"}), 404
            
            success = storage.delete_project(project_id)
            if success:
                return "", 204
            else:
                return jsonify({"error": "Failed to delete project"}), 500
        except Exception as e:
            logger.error(f"Error deleting project {project_id}: {e}")
            return jsonify({"error": "Failed to delete project"}), 500
    
    # Brand concept routes
    @app.route('/api/projects/<int:project_id>/concepts', methods=['GET'])
    def get_brand_concepts(project_id):
        """Get all brand concepts for a project"""
        try:
            project = storage.get_project(project_id)
            if not project:
                return jsonify({"error": "Project not found"}), 404
            
            concepts = storage.get_brand_concepts(project_id)
            return jsonify(concepts)
        except Exception as e:
            logger.error(f"Error fetching brand concepts for project {project_id}: {e}")
            return jsonify({"error": "Failed to fetch brand concepts"}), 500
    
    @app.route('/api/concepts/<int:concept_id>', methods=['GET'])
    def get_brand_concept(concept_id):
        """Get a brand concept by ID"""
        try:
            concept = storage.get_brand_concept(concept_id)
            if not concept:
                return jsonify({"error": "Brand concept not found"}), 404
            return jsonify(concept)
        except Exception as e:
            logger.error(f"Error fetching brand concept {concept_id}: {e}")
            return jsonify({"error": "Failed to fetch brand concept"}), 500
    
    @app.route('/api/generate-concept', methods=['POST'])
    def generate_concept():
        """Generate a brand concept using Claude/Anthropic"""
        logger.info("Received request to generate brand concept")
        
        # First, validate the input data
        try:
            logger.info("Validating brand input data")
            brand_input = request.json
            logger.info("Input data validated successfully")
            
            def generate():
                """Generator function for streaming response"""
                # Send initial response
                yield json.dumps({
                    "status": "processing",
                    "message": "Brand concept generation has started. This may take up to 1-2 minutes to complete."
                })
                
                try:
                    logger.info("Calling AI service to generate brand concept")
                    # Generate the brand concept using the AI service
                    brand_output = generate_brand_concept(brand_input, anthropic_client)
                    logger.info("AI service returned brand concept successfully")
                    
                    # Send the final result
                    yield json.dumps({
                        "success": True,
                        "status": "complete",
                        "brandOutput": brand_output
                    })
                except Exception as e:
                    logger.error(f"Error generating brand concept: {e}")
                    yield json.dumps({
                        "success": False,
                        "error": "Failed to generate brand concept",
                        "message": str(e)
                    })
            
            return Response(stream_with_context(generate()), content_type='application/json')
            
        except Exception as e:
            logger.error(f"Error in generate-concept: {e}")
            return jsonify({"error": "Failed to process request"}), 500
    
    @app.route('/api/test-replicate', methods=['GET'])
    def test_replicate():
        """Test route for Replicate API with FLUX model"""
        try:
            logger.info("Testing Replicate API with FLUX model...")
            
            # Simple test prompt for FLUX model
            test_prompt = "Create a minimalist logo for a coffee shop called 'Sunrise Brew' with orange and brown colors"
            
            logger.info("Sending request to Replicate with test prompt...")
            output = replicate_client.run(
                "black-forest-labs/flux-pro",
                input={
                    "prompt": test_prompt,
                    "width": 1024,
                    "height": 1024,
                    "negative_prompt": "low quality, distorted",
                    "num_outputs": 1,
                    "num_inference_steps": 25
                }
            )
            
            logger.info(f"Replicate test response: {json.dumps(output)}")
            
            return jsonify({
                "success": True,
                "message": "Replicate API test successful",
                "output": output
            })
        except Exception as e:
            logger.error(f"Replicate API test error: {e}")
            return jsonify({
                "error": "Replicate API test failed",
                "details": str(e)
            }), 500
    
    @app.route('/api/test-claude', methods=['POST'])
    def test_claude():
        """Test route for Claude concept generation"""
        try:
            data = request.json
            brand_name = data.get('brandName')
            industry = data.get('industry')
            description = data.get('description')
            values = data.get('values')
            design_style = data.get('designStyle')
            color_preferences = data.get('colorPreferences')
            
            if not brand_name:
                return jsonify({"error": "Brand name is required"}), 400
            
            logger.info("Testing Claude concept generation...")
            # Generate a unique timestamp seed
            unique_seed = datetime.now().timestamp() % 1000
            variety_factor = int(time.time() * 10) % 10
            
            prompt = f"""
                Generate a fresh, original, and comprehensive brand identity for a company with the following details:
                - Brand Name: {brand_name}
                - Industry: {industry or 'General business'}
                - Description: {description or 'A modern business'}
                - Values: {', '.join([v.get('value') for v in values]) if isinstance(values, list) else 'Quality, Innovation'}
                - Design Style: {design_style or 'modern'}
                - Color Preferences: {', '.join(color_preferences) if isinstance(color_preferences, list) else 'Open to suggestions'}
                - Unique design seed: {unique_seed}
                - Variety factor: {variety_factor}
                
                Include the following in your response:
                1. A distinctive color palette with 4-5 colors (primary, secondary, accent, and base colors)
                2. Typography recommendations (heading and body fonts) that perfectly match the brand personality
                3. A creative and memorable logo concept description
                
                Format your response as a structured JSON object with these fields (and nothing else):
                {{
                  "colors": [
                    {{ "name": "Primary", "hex": "#hex", "type": "primary" }},
                    {{ "name": "Secondary", "hex": "#hex", "type": "secondary" }},
                    {{ "name": "Accent", "hex": "#hex", "type": "accent" }},
                    {{ "name": "Base", "hex": "#hex", "type": "base" }}
                  ],
                  "typography": {{
                    "headings": "Font Name",
                    "body": "Font Name"
                  }},
                  "logoDescription": "Description of the logo concept"
                }}
                
                Return only the JSON object with no additional text before or after.
            """
            
            response = anthropic_client.messages.create(
                model="claude-3-7-sonnet-20250219",  # Using the latest Claude model
                max_tokens=2000,
                temperature=0.7,
                system="You are a skilled brand identity designer. Provide detailed brand concepts in JSON format only. Be creative and varied with your designs. Every time you're called, generate something different and unique.",
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Extract the design concept
            if response.content[0].type == 'text':
                content = response.content[0].text
                if not content:
                    raise Exception("Empty response from Claude")
                
                # Extract JSON from the response
                import re
                json_match = re.search(r'\{[\s\S]*\}', content)
                json_str = json_match.group(0) if json_match else content
                
                parsed_output = json.loads(json_str)
                
                return jsonify({
                    "success": True,
                    "message": "Claude concept generation successful",
                    "brandConcept": parsed_output
                })
            else:
                raise Exception("Unexpected response format from Claude")
                
        except Exception as e:
            logger.error(f"Claude concept generation error: {e}")
            return jsonify({
                "error": "Claude concept generation failed",
                "details": str(e)
            }), 500
    
    @app.route('/api/test-flux-logo', methods=['POST'])
    def test_flux_logo():
        """Test route for FLUX logo generation"""
        try:
            data = request.json
            brand_name = data.get('brandName')
            prompt = data.get('prompt')
            
            if not brand_name or not prompt:
                return jsonify({"error": "Brand name and prompt are required"}), 400
            
            logger.info("Testing direct FLUX logo generation...")
            
            logger.info("Sending logo prompt to FLUX model...")
            output = replicate_client.run(
                "black-forest-labs/flux-pro",
                input={
                    "prompt": prompt,
                    "width": 1024,
                    "height": 1024,
                    "negative_prompt": "low quality, distorted, ugly, bad proportions, text errors",
                    "num_outputs": 1,
                    "num_inference_steps": 25
                }
            )
            
            logger.info(f"FLUX logo response: {json.dumps(output)}")
            
            # Get the URL from the response
            image_url = output[0] if isinstance(output, list) else str(output)
            
            # Create an SVG wrapper for the image
            logo_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                <image href="{image_url}" width="200" height="200" preserveAspectRatio="xMidYMid meet"/>
            </svg>"""
            
            return jsonify({
                "success": True,
                "message": "FLUX logo generation successful",
                "imageUrl": image_url,
                "logoSvg": logo_svg
            })
            
        except Exception as e:
            logger.error(f"FLUX logo generation error: {e}")
            return jsonify({
                "error": "FLUX logo generation failed",
                "details": str(e)
            }), 500
    
    @app.route('/api/generate-logo', methods=['POST'])
    def generate_logo():
        """Generate logo or billboard using the FLUX AI model"""
        try:
            data = request.json
            brand_name = data.get('brandName')
            industry = data.get('industry')
            description = data.get('description', '')
            values = data.get('values', [])
            style = data.get('style', 'modern')
            colors = data.get('colors', [])
            prompt = data.get('prompt')
            
            if not brand_name or not industry:
                return jsonify({"error": "Brand name and industry are required"}), 400
            
            # If a prompt is provided, use it for custom image generation (billboard, etc.)
            if prompt:
                try:
                    logger.info(f"Generating custom image with Flux AI using prompt: {prompt[:100]}...")
                    
                    # Call Replicate's Flux model
                    image_output = replicate_client.run(
                        "black-forest-labs/flux-pro",
                        input={
                            "prompt": prompt,
                            "width": 1024,
                            "height": 768,  # Billboard aspect ratio
                            "negative_prompt": "low quality, distorted, ugly, bad proportions, text errors, text cut off, spelling errors",
                            "num_outputs": 1,
                            "num_inference_steps": 25
                        }
                    )
                    
                    # Get the image URL
                    image_url = image_output[0] if isinstance(image_output, list) else str(image_output)
                    
                    # Create SVG wrapper
                    logo_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1024 768">
                        <image href="{image_url}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
                    </svg>"""
                    
                    return jsonify({
                        "success": True,
                        "logoSvg": logo_svg,
                        "imageUrl": image_url
                    })
                    
                except Exception as e:
                    logger.error(f"Flux AI generation error: {e}")
                    return jsonify({"error": "Failed to generate custom image"}), 500
            
            # Generate a logo using generate_logo function
            # Implementation of generate_logo would be in a separate file
            from ai_helpers import generate_logo
            
            logo = generate_logo(
                brand_name=brand_name,
                industry=industry,
                description=description,
                values=values,
                style=style,
                colors=colors,
                replicate_client=replicate_client
            )
            
            return jsonify({
                "success": True,
                "logoSvg": logo.get("logoSvg"),
                "monochromeSvg": logo.get("monochromeSvg"),
                "reverseSvg": logo.get("reverseSvg")
            })
            
        except Exception as e:
            logger.error(f"Logo generation error: {e}")
            return jsonify({"error": "Failed to generate logo"}), 500

    @app.route('/api/projects/<int:project_id>/concepts', methods=['POST'])
    def create_brand_concept(project_id):
        """Create a new brand concept for a project"""
        try:
            project = storage.get_project(project_id)
            if not project:
                return jsonify({"error": "Project not found"}), 404
            
            concept_data = request.json
            concept_data["projectId"] = project_id
            
            # Validate concept data here if needed
            
            concept = storage.create_brand_concept(concept_data)
            return jsonify(concept), 201
        except Exception as e:
            logger.error(f"Error creating brand concept: {e}")
            return jsonify({"error": "Failed to create brand concept"}), 500
    
    @app.route('/api/concepts/<int:concept_id>/set-active', methods=['PATCH'])
    def set_active_concept(concept_id):
        """Set a brand concept as active for its project"""
        try:
            concept = storage.get_brand_concept(concept_id)
            if not concept:
                return jsonify({"error": "Brand concept not found"}), 404
            
            success = storage.set_active_brand_concept(concept_id, concept["projectId"])
            if success:
                updated_concept = storage.get_brand_concept(concept_id)
                return jsonify(updated_concept)
            else:
                return jsonify({"error": "Failed to set active brand concept"}), 500
        except Exception as e:
            logger.error(f"Error setting active brand concept {concept_id}: {e}")
            return jsonify({"error": "Failed to set active brand concept"}), 500
    
    @app.route('/api/concepts/<int:concept_id>', methods=['DELETE'])
    def delete_brand_concept(concept_id):
        """Delete a brand concept"""
        try:
            concept = storage.get_brand_concept(concept_id)
            if not concept:
                return jsonify({"error": "Brand concept not found"}), 404
            
            success = storage.delete_brand_concept(concept_id)
            if success:
                return "", 204
            else:
                return jsonify({"error": "Failed to delete brand concept"}), 500
        except Exception as e:
            logger.error(f"Error deleting brand concept {concept_id}: {e}")
            return jsonify({"error": "Failed to delete brand concept"}), 500
    
    @app.route('/api/regenerate-element', methods=['POST'])
    def regenerate_element():
        """Regenerate a specific element of a brand concept"""
        try:
            data = request.json
            concept_id = data.get('conceptId')
            element_type = data.get('elementType')
            
            if not concept_id or not element_type:
                return jsonify({"error": "Concept ID and element type are required"}), 400
            
            concept = storage.get_brand_concept(concept_id)
            if not concept:
                return jsonify({"error": "Brand concept not found"}), 404
            
            # Implementation of regenerate_element would be in a separate file
            from ai_helpers import regenerate_element
            
            updated_element = regenerate_element(
                concept=concept,
                element_type=element_type,
                anthropic_client=anthropic_client,
                replicate_client=replicate_client
            )
            
            if updated_element:
                # Update the brand concept with the new element
                brand_output = concept["brandOutput"]
                
                if element_type == "colors":
                    brand_output["colors"] = updated_element
                elif element_type == "typography":
                    brand_output["typography"] = updated_element
                elif element_type == "logo":
                    brand_output["logo"] = updated_element
                elif element_type == "tagline":
                    brand_output["tagline"] = updated_element
                
                updated_concept = storage.update_brand_concept(concept_id, {"brandOutput": brand_output})
                
                return jsonify({
                    "success": True,
                    "element": updated_element,
                    "fullConcept": updated_concept
                })
            else:
                return jsonify({"error": "Failed to regenerate element"}), 500
                
        except Exception as e:
            logger.error(f"Error regenerating element: {e}")
            return jsonify({"error": "Failed to regenerate element"}), 500

# Helper functions
def generate_brand_concept(brand_input, anthropic_client):
    """Generate a brand concept using Claude/Anthropic"""
    # Implementation of this function would be in a separate file
    # For now, let's add a placeholder implementation
    from ai_helpers import generate_brand_concept
    return generate_brand_concept(brand_input, anthropic_client)