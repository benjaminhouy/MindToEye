"""AI helper functions for brand concept and logo generation"""
import json
import logging
import random
import re
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_brand_concept(brand_input: Dict[str, Any], anthropic_client) -> Dict[str, Any]:
    """
    Generate a brand concept using Claude/Anthropic AI
    
    Args:
        brand_input: Dictionary containing brand information
        anthropic_client: Initialized Anthropic client
        
    Returns:
        Dict containing the brand concept output
    """
    brand_name = brand_input.get('brandName')
    industry = brand_input.get('industry')
    description = brand_input.get('description')
    values = brand_input.get('values', [])
    design_style = brand_input.get('designStyle', 'modern')
    color_preferences = brand_input.get('colorPreferences', [])
    
    if not brand_name:
        raise ValueError("Brand name is required")
    
    logger.info(f"Generating brand concept for {brand_name}...")
    
    # Generate a unique timestamp seed for variety
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
        4. A catchy and meaningful tagline
        5. Professional contact information with realistic name, title, phone and address
        
        Format your response as a structured JSON object with these fields (and nothing else):
        {{
          "colors": [
            {{ "name": "Color Name", "hex": "#hex", "type": "primary" }},
            {{ "name": "Color Name", "hex": "#hex", "type": "secondary" }},
            {{ "name": "Color Name", "hex": "#hex", "type": "accent" }},
            {{ "name": "Color Name", "hex": "#hex", "type": "base" }}
          ],
          "typography": {{
            "headings": "Font Name",
            "body": "Font Name"
          }},
          "logoDescription": "Detailed description of the logo concept",
          "tagline": "Catchy brand tagline",
          "contactName": "Contact Person Name",
          "contactTitle": "Professional Title",
          "contactPhone": "555-123-4567",
          "address": "123 Brand St, Business City, ST 12345"
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
        json_match = re.search(r'\{[\s\S]*\}', content)
        json_str = json_match.group(0) if json_match else content
        
        try:
            claude_output = json.loads(json_str)
            logger.info("Successfully parsed Claude output")
            
            # Generate logo using the description
            logo_description = claude_output.get("logoDescription", "")
            colors = [color["hex"] for color in claude_output.get("colors", [])]
            
            logo_svgs = generate_logo_svgs(
                brand_name=brand_name,
                industry=industry or "",
                description=description or "",
                design_style=design_style or "modern",
                logo_description=logo_description,
                colors=colors
            )
            
            # Combine the Claude output with the logo SVGs
            brand_output = {
                **claude_output,
                "logo": logo_svgs
            }
            
            return brand_output
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude output: {e}")
            logger.error(f"Claude raw output: {content[:500]}...")
            raise Exception(f"Failed to parse Claude output: {str(e)}")
    else:
        raise Exception("Unexpected response format from Claude")

def generate_logo_svgs(brand_name, industry, description, design_style, logo_description, colors):
    """
    This function is a placeholder for actual logo generation.
    In a real implementation, it would call the FLUX AI model via Replicate.
    
    For now, we'll return placeholder SVG content.
    """
    # In the full implementation, this would call the Replicate API with FLUX model
    primary_color = colors[0] if colors else "#4A90E2"
    secondary_color = colors[1] if len(colors) > 1 else "#333333"
    
    # Create a simple placeholder SVG
    primary_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="{secondary_color}" />
        <text x="50%" y="50%" font-family="Arial" font-size="24" fill="{primary_color}" text-anchor="middle" dominant-baseline="middle">{brand_name}</text>
    </svg>"""
    
    # Create monochrome version (black and white)
    monochrome_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#FFFFFF" />
        <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#000000" text-anchor="middle" dominant-baseline="middle">{brand_name}</text>
    </svg>"""
    
    # Create reverse version (inverted colors)
    reverse_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="{primary_color}" />
        <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">{brand_name}</text>
    </svg>"""
    
    return {
        "primary": primary_svg,
        "monochrome": monochrome_svg,
        "reverse": reverse_svg
    }

def generate_logo(brand_name, industry, description, values, style, colors, replicate_client):
    """
    Generate a logo using FLUX AI via Replicate
    
    Args:
        brand_name: The name of the brand
        industry: The industry of the brand
        description: Description of the brand
        values: List of brand values
        style: Design style preference
        colors: List of preferred colors
        replicate_client: Initialized Replicate client
        
    Returns:
        Dict containing the generated logo SVGs
    """
    try:
        logger.info(f"Generating logo for {brand_name} with FLUX AI...")
        
        # Extract values for the prompt
        values_text = ", ".join([v.get("value") for v in values]) if isinstance(values, list) and values else "quality, innovation"
        color_text = ", ".join(colors) if colors else "modern colors"
        
        # Craft the prompt for the logo generation
        prompt = f"""
            Create a professional, modern logo for a company named "{brand_name}".
            Industry: {industry}
            Brand values: {values_text}
            Style: {style}
            Color scheme: {color_text}
            
            The logo should be clean, memorable, and instantly recognizable.
            It should work well at different sizes and in both color and monochrome formats.
            No text in the logo, just a distinctive symbol or icon.
        """
        
        # Call Replicate's FLUX model
        output = replicate_client.run(
            "black-forest-labs/flux-pro",
            input={
                "prompt": prompt,
                "width": 1024,
                "height": 1024,
                "negative_prompt": "low quality, distorted, ugly, bad proportions, text errors, words, letters",
                "num_outputs": 1,
                "num_inference_steps": 25
            }
        )
        
        # Get the image URL
        image_url = output[0] if isinstance(output, list) else str(output)
        
        # Create SVG wrapper for the image
        primary_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <image href="{image_url}" width="200" height="200" preserveAspectRatio="xMidYMid meet"/>
        </svg>"""
        
        # Generate monochrome and reverse versions
        monochrome_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <filter id="grayscale">
                <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 1 0"/>
            </filter>
            <image href="{image_url}" width="200" height="200" preserveAspectRatio="xMidYMid meet" filter="url(#grayscale)"/>
        </svg>"""
        
        reverse_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <filter id="invert">
                <feColorMatrix type="matrix" values="-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0"/>
            </filter>
            <image href="{image_url}" width="200" height="200" preserveAspectRatio="xMidYMid meet" filter="url(#invert)"/>
        </svg>"""
        
        return {
            "primary": primary_svg,
            "monochrome": monochrome_svg,
            "reverse": reverse_svg
        }
        
    except Exception as e:
        logger.error(f"Error generating logo with FLUX AI: {e}")
        
        # If FLUX generation fails, fall back to the placeholder implementation
        return generate_logo_svgs(
            brand_name=brand_name,
            industry=industry,
            description=description,
            design_style=style,
            logo_description=f"Logo for {brand_name} in the {industry} industry",
            colors=colors
        )

def regenerate_element(concept, element_type, anthropic_client, replicate_client):
    """
    Regenerate a specific element of a brand concept
    
    Args:
        concept: The existing brand concept
        element_type: The type of element to regenerate (colors, typography, logo, etc.)
        anthropic_client: Initialized Anthropic client
        replicate_client: Initialized Replicate client
        
    Returns:
        The regenerated element
    """
    brand_inputs = concept.get("brandInputs", {})
    brand_output = concept.get("brandOutput", {})
    
    brand_name = brand_inputs.get("brandName", "")
    industry = brand_inputs.get("industry", "")
    description = brand_inputs.get("description", "")
    values = brand_inputs.get("values", [])
    design_style = brand_inputs.get("designStyle", "modern")
    color_preferences = brand_inputs.get("colorPreferences", [])
    
    if element_type == "colors":
        return regenerate_colors(
            brand_name=brand_name,
            industry=industry,
            description=description,
            values=values,
            design_style=design_style,
            anthropic_client=anthropic_client
        )
    elif element_type == "typography":
        existing_colors = brand_output.get("colors", [])
        return regenerate_typography(
            brand_name=brand_name,
            industry=industry,
            description=description,
            values=values,
            design_style=design_style,
            existing_colors=existing_colors,
            anthropic_client=anthropic_client
        )
    elif element_type == "logo":
        existing_colors = brand_output.get("colors", [])
        return regenerate_logo(
            brand_name=brand_name,
            industry=industry,
            description=description,
            values=values,
            design_style=design_style,
            existing_colors=existing_colors,
            replicate_client=replicate_client
        )
    elif element_type == "tagline":
        return regenerate_tagline(
            brand_name=brand_name,
            industry=industry,
            description=description,
            values=values,
            design_style=design_style,
            anthropic_client=anthropic_client
        )
    else:
        raise ValueError(f"Unsupported element type: {element_type}")

def regenerate_colors(brand_name, industry, description, values, design_style, anthropic_client):
    """Regenerate color palette for a brand using Claude"""
    # Extract values for the prompt
    values_text = ", ".join([v.get("value") for v in values]) if isinstance(values, list) and values else "quality, innovation"
    
    # Generate a unique timestamp seed
    unique_seed = datetime.now().timestamp() % 1000
    
    prompt = f"""
        Generate a fresh, distinctive color palette for a brand with the following details:
        - Brand Name: {brand_name}
        - Industry: {industry or 'General business'}
        - Description: {description or 'A modern business'}
        - Values: {values_text}
        - Design Style: {design_style or 'modern'}
        - Unique design seed: {unique_seed}
        
        Create a color palette with 4-5 colors including primary, secondary, accent, and base colors.
        These colors should work well together while reflecting the brand's identity and values.
        
        Format your response as a JSON array with this structure:
        [
          {{ "name": "Color Name", "hex": "#hex", "type": "primary" }},
          {{ "name": "Color Name", "hex": "#hex", "type": "secondary" }},
          {{ "name": "Color Name", "hex": "#hex", "type": "accent" }},
          {{ "name": "Color Name", "hex": "#hex", "type": "base" }}
        ]
        
        Return only the JSON array with no additional text before or after.
    """
    
    response = anthropic_client.messages.create(
        model="claude-3-7-sonnet-20250219",
        max_tokens=1000,
        temperature=0.7,
        system="You are a professional color specialist for brand identity design. Generate unique and harmonious color palettes. Every time you're called, create a different palette.",
        messages=[{"role": "user", "content": prompt}]
    )
    
    # Extract the colors
    if response.content[0].type == 'text':
        content = response.content[0].text
        if not content:
            raise Exception("Empty response from Claude")
        
        # Extract JSON from the response
        json_match = re.search(r'\[[\s\S]*\]', content)
        json_str = json_match.group(0) if json_match else content
        
        return json.loads(json_str)
    else:
        raise Exception("Unexpected response format from Claude")

def regenerate_typography(brand_name, industry, description, values, design_style, existing_colors, anthropic_client):
    """Regenerate typography for a brand using Claude"""
    # Extract values and colors for the prompt
    values_text = ", ".join([v.get("value") for v in values]) if isinstance(values, list) and values else "quality, innovation"
    colors_text = ", ".join([f"{c.get('name')} ({c.get('hex')})" for c in existing_colors]) if existing_colors else "brand colors"
    
    # Generate a unique timestamp seed
    unique_seed = datetime.now().timestamp() % 1000
    
    prompt = f"""
        Recommend typography for a brand with the following details:
        - Brand Name: {brand_name}
        - Industry: {industry or 'General business'}
        - Description: {description or 'A modern business'}
        - Values: {values_text}
        - Design Style: {design_style or 'modern'}
        - Color Palette: {colors_text}
        - Unique design seed: {unique_seed}
        
        Recommend typography that perfectly complements the brand personality and works well with the color palette.
        Choose real, accessible fonts that are widely available on standard font services.
        
        Format your response as a JSON object with this structure:
        {{
          "headings": "Font Name",
          "body": "Font Name"
        }}
        
        Return only the JSON object with no additional text before or after.
    """
    
    response = anthropic_client.messages.create(
        model="claude-3-7-sonnet-20250219",
        max_tokens=1000,
        temperature=0.7,
        system="You are a typography expert for brand identity design. Recommend font pairings that match brand personalities. Choose real, accessible fonts that are widely available.",
        messages=[{"role": "user", "content": prompt}]
    )
    
    # Extract the typography
    if response.content[0].type == 'text':
        content = response.content[0].text
        if not content:
            raise Exception("Empty response from Claude")
        
        # Extract JSON from the response
        json_match = re.search(r'\{[\s\S]*\}', content)
        json_str = json_match.group(0) if json_match else content
        
        return json.loads(json_str)
    else:
        raise Exception("Unexpected response format from Claude")

def regenerate_logo(brand_name, industry, description, values, design_style, existing_colors, replicate_client):
    """Regenerate logo for a brand using FLUX AI via Replicate"""
    # Get color hex values from existing colors
    colors = [color.get("hex") for color in existing_colors if "hex" in color]
    
    # Call the logo generation function
    return generate_logo(
        brand_name=brand_name,
        industry=industry,
        description=description,
        values=values,
        style=design_style,
        colors=colors,
        replicate_client=replicate_client
    )

def regenerate_tagline(brand_name, industry, description, values, design_style, anthropic_client):
    """Regenerate tagline for a brand using Claude"""
    # Extract values for the prompt
    values_text = ", ".join([v.get("value") for v in values]) if isinstance(values, list) and values else "quality, innovation"
    
    # Generate a unique timestamp seed
    unique_seed = datetime.now().timestamp() % 1000
    
    prompt = f"""
        Create a catchy, memorable, and meaningful tagline for a brand with the following details:
        - Brand Name: {brand_name}
        - Industry: {industry or 'General business'}
        - Description: {description or 'A modern business'}
        - Values: {values_text}
        - Design Style: {design_style or 'modern'}
        - Unique seed: {unique_seed}
        
        The tagline should be concise (3-7 words) and capture the essence of the brand.
        It should be distinctive, easy to remember, and convey the brand's unique value proposition.
        
        Format your response as a simple JSON object:
        {{ "tagline": "Your Catchy Tagline Here" }}
        
        Return only the JSON object with no additional text before or after.
    """
    
    response = anthropic_client.messages.create(
        model="claude-3-7-sonnet-20250219",
        max_tokens=500,
        temperature=0.7,
        system="You are a creative copywriter specializing in brand taglines. Create catchy, concise, and memorable taglines that capture a brand's essence. Every time you're called, generate something completely different.",
        messages=[{"role": "user", "content": prompt}]
    )
    
    # Extract the tagline
    if response.content[0].type == 'text':
        content = response.content[0].text
        if not content:
            raise Exception("Empty response from Claude")
        
        # Extract JSON from the response
        json_match = re.search(r'\{[\s\S]*\}', content)
        json_str = json_match.group(0) if json_match else content
        
        return json.loads(json_str)
    else:
        raise Exception("Unexpected response format from Claude")