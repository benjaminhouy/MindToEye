"""AI helper functions for brand concept and logo generation"""
import json
import logging
from typing import Dict, List, Any, Optional

# Configure logging
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
    try:
        brand_name = brand_input["brandName"]
        industry = brand_input.get("industry", "")
        description = brand_input.get("description", "")
        values = brand_input.get("values", [])
        design_style = brand_input.get("designStyle", "modern")
        color_preferences = brand_input.get("colorPreferences", [])
        
        # Extract just the values from the values list
        value_strings = [v["value"] for v in values]
        
        # Create the prompt for Claude
        prompt = f"""
        Create a comprehensive brand identity concept for the following brand:
        
        Brand Name: {brand_name}
        Industry: {industry}
        Description: {description}
        Core Values: {', '.join(value_strings)}
        Design Style Preference: {design_style}
        Color Preferences: {', '.join(color_preferences) if color_preferences else 'No specific preferences'}
        
        Please provide a complete brand identity package that includes:
        
        1. A detailed logo description that could be used to generate a visual logo
        2. A color palette with 4-5 colors including primary, secondary, accent, and base colors (with names and hex codes)
        3. Typography recommendations for headings and body text
        4. A memorable tagline that captures the brand essence
        
        Format your response as a JSON object with the following structure:
        ```json
        {
          "logoDescription": "Detailed description of the logo concept",
          "colors": [
            {"name": "Color Name", "hex": "#HEXCODE", "type": "primary/secondary/accent/base"}
          ],
          "typography": {
            "headings": "Heading Font",
            "body": "Body Font"
          },
          "tagline": "Brand Tagline"
        }
        ```
        
        Make sure the response is valid JSON and the formatting exactly matches the example structure.
        """
        
        logger.info(f"Generating brand concept for {brand_name}")
        
        # the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        response = anthropic_client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=4000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract JSON from Claude's response
        response_content = response.content[0].text
        
        # Find JSON content between triple backticks
        json_start = response_content.find("```json")
        json_end = response_content.rfind("```")
        
        if json_start != -1 and json_end != -1:
            json_content = response_content[json_start + 7:json_end].strip()
        else:
            json_content = response_content
        
        # Clean up any remaining markdown
        json_content = json_content.replace("```", "").strip()
        
        concept_data = json.loads(json_content)
        
        # Generate logo SVGs using the logo description
        logo_svgs = generate_logo_svgs(
            brand_name=brand_name,
            industry=industry,
            description=description,
            design_style=design_style,
            logo_description=concept_data.get("logoDescription", ""),
            colors=[color["hex"] for color in concept_data.get("colors", [])]
        )
        
        # Combine logo SVGs with the concept data
        brand_output = {
            "logo": logo_svgs,
            "colors": concept_data.get("colors", []),
            "typography": concept_data.get("typography", {"headings": "Arial", "body": "Helvetica"}),
            "tagline": concept_data.get("tagline", ""),
            "logoDescription": concept_data.get("logoDescription", "")
        }
        
        logger.info(f"Successfully generated brand concept for {brand_name}")
        return brand_output
    
    except Exception as e:
        logger.error(f"Error generating brand concept: {str(e)}")
        raise

def generate_logo_svgs(brand_name, industry, description, design_style, logo_description, colors):
    """
    This function is a placeholder for actual logo generation.
    In a real implementation, it would call the FLUX AI model via Replicate.
    
    For now, we'll return placeholder SVG content.
    """
    # Default colors if none provided
    primary_color = colors[0] if colors else "#3B82F6"
    secondary_color = colors[1] if len(colors) > 1 else "#10B981"
    
    # Generate SVG placeholders
    primary_svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100"><rect width="200" height="100" fill="white"/><circle cx="50" cy="50" r="40" fill="{primary_color}"/><text x="100" y="55" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle">{brand_name}</text></svg>'
    
    monochrome_svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100"><rect width="200" height="100" fill="white"/><circle cx="50" cy="50" r="40" fill="#000000"/><text x="100" y="55" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle">{brand_name}</text></svg>'
    
    reverse_svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100"><rect width="200" height="100" fill="black"/><circle cx="50" cy="50" r="40" fill="white"/><text x="100" y="55" font-family="Arial" font-size="24" font-weight="bold" fill="white" text-anchor="middle">{brand_name}</text></svg>'
    
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
        # Create a prompt for FLUX
        values_text = ', '.join(values) if isinstance(values, list) else values
        colors_text = ', '.join(colors) if isinstance(colors, list) else colors
        
        prompt = f"""
        Create a logo for a brand with the following details:
        
        Brand Name: {brand_name}
        Industry: {industry}
        Description: {description}
        Values: {values_text}
        Style: {style}
        Colors: {colors_text}
        
        The logo should be professional, memorable, and aligned with the brand's values and industry.
        """
        
        # Call the FLUX model via Replicate
        logger.info(f"Generating logo for {brand_name} using FLUX AI")
        
        # Example model and version from Replicate (replace with actual FLUX model)
        model = "fal-ai/flux1.1:pro"
        
        output = replicate_client.run(
            model,
            input={
                "prompt": prompt,
                "image_count": 1,
                "format": "svg"
            }
        )
        
        # Process the output to get the SVG content
        if output and isinstance(output, list) and len(output) > 0:
            primary_svg = output[0]
            
            # Create monochrome and reverse versions
            monochrome_svg = create_monochrome_version(primary_svg)
            reverse_svg = create_reverse_version(primary_svg)
            
            logo_svgs = {
                "primary": primary_svg,
                "monochrome": monochrome_svg,
                "reverse": reverse_svg
            }
            
            logger.info(f"Successfully generated logo for {brand_name}")
            return logo_svgs
        else:
            logger.error("Failed to generate logo: No output from Replicate")
            # Return placeholder SVGs
            return generate_logo_svgs(brand_name, industry, description, style, "", colors)
    
    except Exception as e:
        logger.error(f"Error generating logo: {str(e)}")
        # Return placeholder SVGs on error
        return generate_logo_svgs(brand_name, industry, description, style, "", colors)

def create_monochrome_version(svg_content):
    """Convert color SVG to monochrome"""
    # This is a simplified implementation
    # In a real app, you would use a proper SVG parser and transformer
    return svg_content.replace('fill="#', 'fill="#000000').replace('stroke="#', 'stroke="#000000')

def create_reverse_version(svg_content):
    """Create reversed color version of SVG"""
    # This is a simplified implementation
    # In a real app, you would use a proper SVG parser and transformer
    return svg_content.replace('fill="white"', 'fill="black"').replace('fill="black"', 'fill="white"')

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
    try:
        brand_inputs = concept["brandInputs"]
        brand_name = brand_inputs["brandName"]
        industry = brand_inputs.get("industry", "")
        description = brand_inputs.get("description", "")
        values = brand_inputs.get("values", [])
        design_style = brand_inputs.get("designStyle", "modern")
        
        # Extract just the values from the values list
        value_strings = [v["value"] for v in values]
        
        existing_colors = concept["brandOutput"].get("colors", [])
        
        if element_type == "colors":
            return regenerate_colors(brand_name, industry, description, value_strings, design_style, anthropic_client)
        
        elif element_type == "typography":
            return regenerate_typography(brand_name, industry, description, value_strings, design_style, existing_colors, anthropic_client)
        
        elif element_type == "logo":
            return regenerate_logo(brand_name, industry, description, value_strings, design_style, existing_colors, replicate_client)
        
        elif element_type == "tagline":
            return regenerate_tagline(brand_name, industry, description, value_strings, design_style, anthropic_client)
        
        else:
            raise ValueError(f"Unknown element type: {element_type}")
    
    except Exception as e:
        logger.error(f"Error regenerating {element_type}: {str(e)}")
        raise

def regenerate_colors(brand_name, industry, description, values, design_style, anthropic_client):
    """Regenerate color palette for a brand using Claude"""
    try:
        prompt = f"""
        Create a professional color palette for the following brand:
        
        Brand Name: {brand_name}
        Industry: {industry}
        Description: {description}
        Core Values: {', '.join(values)}
        Design Style: {design_style}
        
        Generate a unique and refreshed color palette with 4-5 colors including:
        - A primary brand color
        - A secondary color
        - An accent color
        - 1-2 base/neutral colors
        
        For each color, provide:
        - A creative name that relates to the brand
        - The exact hex code
        - The type (primary, secondary, accent, or base)
        
        Format your response as a JSON array with this structure:
        ```json
        [
            {{"name": "Color Name", "hex": "#HEXCODE", "type": "primary"}},
            {{"name": "Color Name", "hex": "#HEXCODE", "type": "secondary"}},
            {{"name": "Color Name", "hex": "#HEXCODE", "type": "accent"}},
            {{"name": "Color Name", "hex": "#HEXCODE", "type": "base"}}
        ]
        ```
        
        Make sure the colors work well together and reflect the brand's personality and industry.
        Make sure the response is valid JSON and the formatting exactly matches the example structure.
        """
        
        logger.info(f"Regenerating colors for {brand_name}")
        
        # the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        response = anthropic_client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract JSON from Claude's response
        response_content = response.content[0].text
        
        # Find JSON content between triple backticks
        json_start = response_content.find("```json")
        json_end = response_content.rfind("```")
        
        if json_start != -1 and json_end != -1:
            json_content = response_content[json_start + 7:json_end].strip()
        else:
            json_content = response_content
        
        # Clean up any remaining markdown
        json_content = json_content.replace("```", "").strip()
        
        colors = json.loads(json_content)
        
        logger.info(f"Successfully regenerated colors for {brand_name}")
        return colors
    
    except Exception as e:
        logger.error(f"Error regenerating colors: {str(e)}")
        raise

def regenerate_typography(brand_name, industry, description, values, design_style, existing_colors, anthropic_client):
    """Regenerate typography for a brand using Claude"""
    try:
        colors_text = ", ".join([f"{c['name']} ({c['hex']})" for c in existing_colors[:3]])
        
        prompt = f"""
        Recommend typography for the following brand:
        
        Brand Name: {brand_name}
        Industry: {industry}
        Description: {description}
        Core Values: {', '.join(values)}
        Design Style: {design_style}
        Brand Colors: {colors_text}
        
        Please suggest a typography pairing that:
        - Complements the brand personality and values
        - Works well with the design style
        - Has a heading font with the right character for the brand
        - Has a body text font that is readable and professional
        
        Format your response as a JSON object with this structure:
        ```json
        {{
            "headings": "Heading Font Name",
            "body": "Body Font Name"
        }}
        ```
        
        Focus on widely available, professional fonts that enhance the brand identity.
        Make sure the response is valid JSON and the formatting exactly matches the example structure.
        """
        
        logger.info(f"Regenerating typography for {brand_name}")
        
        # the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        response = anthropic_client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=1000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract JSON from Claude's response
        response_content = response.content[0].text
        
        # Find JSON content between triple backticks
        json_start = response_content.find("```json")
        json_end = response_content.rfind("```")
        
        if json_start != -1 and json_end != -1:
            json_content = response_content[json_start + 7:json_end].strip()
        else:
            json_content = response_content
        
        # Clean up any remaining markdown
        json_content = json_content.replace("```", "").strip()
        
        typography = json.loads(json_content)
        
        logger.info(f"Successfully regenerated typography for {brand_name}")
        return typography
    
    except Exception as e:
        logger.error(f"Error regenerating typography: {str(e)}")
        raise

def regenerate_logo(brand_name, industry, description, values, design_style, existing_colors, replicate_client):
    """Regenerate logo for a brand using FLUX AI via Replicate"""
    try:
        # Get the primary and secondary colors from existing colors
        primary_color = next((c["hex"] for c in existing_colors if c["type"] == "primary"), "#000000")
        secondary_color = next((c["hex"] for c in existing_colors if c["type"] == "secondary"), "#FFFFFF")
        accent_color = next((c["hex"] for c in existing_colors if c["type"] == "accent"), "#CCCCCC")
        
        colors = [primary_color, secondary_color, accent_color]
        
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
    
    except Exception as e:
        logger.error(f"Error regenerating logo: {str(e)}")
        raise

def regenerate_tagline(brand_name, industry, description, values, design_style, anthropic_client):
    """Regenerate tagline for a brand using Claude"""
    try:
        prompt = f"""
        Create a compelling tagline for the following brand:
        
        Brand Name: {brand_name}
        Industry: {industry}
        Description: {description}
        Core Values: {', '.join(values)}
        Design Style: {design_style}
        
        Generate a memorable, concise tagline that:
        - Captures the essence of the brand
        - Reflects the core values
        - Is unique and not generic
        - Is brief (ideally 3-7 words)
        
        Format your response as a JSON string with this structure:
        ```json
        {{
            "tagline": "Your Brand Tagline Here"
        }}
        ```
        
        Make sure the response is valid JSON and the formatting exactly matches the example structure.
        """
        
        logger.info(f"Regenerating tagline for {brand_name}")
        
        # the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        response = anthropic_client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=1000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract JSON from Claude's response
        response_content = response.content[0].text
        
        # Find JSON content between triple backticks
        json_start = response_content.find("```json")
        json_end = response_content.rfind("```")
        
        if json_start != -1 and json_end != -1:
            json_content = response_content[json_start + 7:json_end].strip()
        else:
            json_content = response_content
        
        # Clean up any remaining markdown
        json_content = json_content.replace("```", "").strip()
        
        tagline_data = json.loads(json_content)
        
        logger.info(f"Successfully regenerated tagline for {brand_name}")
        return tagline_data["tagline"]
    
    except Exception as e:
        logger.error(f"Error regenerating tagline: {str(e)}")
        raise