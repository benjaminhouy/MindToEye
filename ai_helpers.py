import json
import re
import logging
import random
from typing import Dict, List, Any, Optional

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
    logger.info("Generating brand concept with Claude...")
    
    # Extract values from brand input
    brand_name = brand_input.get('brandName', '')
    industry = brand_input.get('industry', '')
    description = brand_input.get('description', '')
    values = brand_input.get('values', [])
    design_style = brand_input.get('designStyle', 'modern')
    color_preferences = brand_input.get('colorPreferences', [])
    
    # Create a formatted list of values
    value_text = ", ".join([v.get('value') for v in values]) if values else "Quality, Innovation, Reliability"
    
    # Color preferences as text
    color_text = ", ".join(color_preferences) if color_preferences else "Open to suggestions"
    
    # Generate a unique seed for variety
    unique_seed = random.randint(1000, 9999)
    
    # Construct the prompt for Claude
    prompt = f"""
    You are a professional brand designer tasked with creating a comprehensive brand identity for:
    
    Brand Name: {brand_name}
    Industry: {industry}
    Description: {description}
    Values: {value_text}
    Design Style: {design_style}
    Color Preferences: {color_text}
    Seed: {unique_seed}
    
    Create a complete brand identity package with the following components:
    
    1. COLOR PALETTE
    - Select 4-5 colors that reflect the brand's personality
    - Include primary, secondary, accent, and base colors with HEX codes
    - Choose colors that work well together and align with the brand values
    
    2. TYPOGRAPHY
    - Recommend appropriate heading and body fonts
    - Choose fonts that reflect the brand's personality and are practical for various applications
    
    3. LOGO CONCEPT
    - Describe a logo design that captures the brand essence
    - The logo should be memorable, distinctive, and aligned with the brand values
    
    4. TAGLINE
    - Create a concise, memorable tagline that communicates the brand's value proposition
    
    5. BRAND VOICE
    - Define the tone and personality for brand communications
    - Include sample contact information for consistency
    
    Format your response as a structured JSON object with these exact keys:
    {{
        "logo": {{
            "primary": "<placeholder>",
            "monochrome": "<placeholder>",
            "reverse": "<placeholder>"
        }},
        "colors": [
            {{ "name": "Color Name", "hex": "#HEXCODE", "type": "primary" }},
            {{ "name": "Color Name", "hex": "#HEXCODE", "type": "secondary" }},
            {{ "name": "Color Name", "hex": "#HEXCODE", "type": "accent" }},
            {{ "name": "Color Name", "hex": "#HEXCODE", "type": "base" }}
        ],
        "typography": {{
            "headings": "Font Name",
            "body": "Font Name"
        }},
        "logoDescription": "Detailed description of the logo",
        "tagline": "Brand tagline",
        "contactName": "Contact person name",
        "contactTitle": "Contact person title",
        "contactPhone": "Phone number",
        "address": "Business address",
        "mockups": []
    }}
    
    Return only valid JSON - no explanations, comments, or additional formatting.
    """
    
    # Call Claude to generate the brand concept
    response = anthropic_client.messages.create(
        model="claude-3-7-sonnet-20250219",  # Using the latest Claude model
        max_tokens=4000,
        temperature=0.7,
        system="You are an expert brand identity designer with 20+ years of experience. Your designs are unique, creative, and perfectly tailored to each client's needs. You output only valid JSON with no additional text.",
        messages=[{"role": "user", "content": prompt}]
    )
    
    # Extract the JSON content from Claude's response
    if response.content[0].type == 'text':
        content = response.content[0].text
        if not content:
            raise Exception("Empty response from Claude")
        
        # Extract JSON from the response
        json_match = re.search(r'\{[\s\S]*\}', content)
        json_str = json_match.group(0) if json_match else content
        
        # Parse the JSON response
        brand_output = json.loads(json_str)
        
        # Now we need to generate the actual logo
        logo_description = brand_output.get("logoDescription", "")
        
        # Generate the logo using Replicate
        brand_output = generate_logo_svgs(
            brand_name=brand_name,
            industry=industry, 
            description=description,
            design_style=design_style,
            logo_description=logo_description,
            colors=brand_output.get("colors", [])
        )
        
        return brand_output
    else:
        raise Exception("Unexpected response format from Claude")

def generate_logo_svgs(brand_name, industry, description, design_style, logo_description, colors):
    """
    This function is a placeholder for actual logo generation.
    In a real implementation, it would call the FLUX AI model via Replicate.
    
    For now, we'll return placeholder SVG content.
    """
    # For a real implementation, this function would call Replicate's FLUX model
    
    # Extract primary color if available
    primary_color = "#1E40AF"  # Default blue
    secondary_color = "#F97316"  # Default orange
    accent_color = "#FFFFFF"  # Default white
    
    for color in colors:
        if color.get("type") == "primary":
            primary_color = color.get("hex", primary_color)
        elif color.get("type") == "secondary":
            secondary_color = color.get("hex", secondary_color)
        elif color.get("type") == "accent":
            accent_color = color.get("hex", accent_color)
    
    # Create a simple placeholder SVG for demonstration
    # In a real implementation, this would be generated by the FLUX AI model
    primary_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <circle cx="100" cy="100" r="80" fill="{primary_color}"/>
        <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="{secondary_color}"/>
        <circle cx="100" cy="100" r="30" fill="{accent_color}"/>
    </svg>'''
    
    # Create monochrome version
    monochrome_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <circle cx="100" cy="100" r="80" fill="#333333"/>
        <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="#666666"/>
        <circle cx="100" cy="100" r="30" fill="#FFFFFF"/>
    </svg>'''
    
    # Create reverse version
    reverse_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <circle cx="100" cy="100" r="80" fill="{accent_color}"/>
        <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="{accent_color}"/>
        <circle cx="100" cy="100" r="30" fill="{primary_color}"/>
    </svg>'''
    
    return {
        "logo": {
            "primary": primary_svg,
            "monochrome": monochrome_svg,
            "reverse": reverse_svg
        }
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
    logger.info(f"Generating logo for {brand_name} with FLUX...")
    
    # In a real implementation, this function would:
    # 1. Craft a prompt for FLUX based on the brand info
    # 2. Call the FLUX model via Replicate 
    # 3. Convert the resulting image into SVG format
    
    # Extract values as text
    values_text = ", ".join([v.get('value') for v in values]) if values else ""
    
    # Extract colors as text
    colors_text = ", ".join(colors) if colors else ""
    
    # Create the prompt for FLUX
    prompt = f"""
    Design a professional, modern logo for {brand_name}.
    Industry: {industry}
    Description: {description}
    Values: {values_text}
    Style: {style}
    Colors: {colors_text}
    
    Create a clean, memorable, and scalable logo that works well at different sizes.
    The logo should have a distinctive shape and avoid using complex details.
    Do not include any text in the logo design itself.
    """
    
    # For this example, we'll return placeholder SVGs
    # In a real implementation, this would call Replicate
    return generate_logo_svgs(
        brand_name=brand_name,
        industry=industry,
        description=description,
        design_style=style,
        logo_description="",
        colors=[]
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
    logger.info(f"Regenerating {element_type} for concept ID {concept.get('id')}")
    
    brand_inputs = concept.get("brandInputs", {})
    brand_output = concept.get("brandOutput", {})
    
    # Extract basic brand information
    brand_name = brand_inputs.get("brandName", "")
    industry = brand_inputs.get("industry", "")
    description = brand_inputs.get("description", "")
    values = brand_inputs.get("values", [])
    design_style = brand_inputs.get("designStyle", "modern")
    
    # Handle different element types
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
        return regenerate_typography(
            brand_name=brand_name,
            industry=industry,
            description=description,
            values=values,
            design_style=design_style,
            existing_colors=brand_output.get("colors", []),
            anthropic_client=anthropic_client
        )
    elif element_type == "logo":
        return regenerate_logo(
            brand_name=brand_name,
            industry=industry,
            description=description,
            values=values,
            design_style=design_style,
            existing_colors=brand_output.get("colors", []),
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
    # Extract values as text
    values_text = ", ".join([v.get('value') for v in values]) if values else ""
    
    # Create a prompt for Claude to generate new colors
    prompt = f"""
    You are a color expert. Generate a fresh, distinctive color palette for the following brand:
    
    Brand Name: {brand_name}
    Industry: {industry}
    Description: {description}
    Values: {values_text}
    Design Style: {design_style}
    
    Create a harmonious color palette with exactly 4 colors:
    1. A primary brand color
    2. A secondary color that complements the primary
    3. An accent color that creates visual interest
    4. A base/background color
    
    Respond ONLY with a JSON array of color objects in this exact format:
    [
        {{ "name": "Descriptive Color Name", "hex": "#HEXCODE", "type": "primary" }},
        {{ "name": "Descriptive Color Name", "hex": "#HEXCODE", "type": "secondary" }},
        {{ "name": "Descriptive Color Name", "hex": "#HEXCODE", "type": "accent" }},
        {{ "name": "Descriptive Color Name", "hex": "#HEXCODE", "type": "base" }}
    ]
    
    Each color needs a creative, descriptive name and an accurate hex code. No additional text.
    """
    
    # Call Claude to generate new colors
    response = anthropic_client.messages.create(
        model="claude-3-7-sonnet-20250219",
        max_tokens=1000,
        temperature=0.7,
        system="You are a professional color designer who specializes in brand color palettes. Output only valid JSON with no additional text.",
        messages=[{"role": "user", "content": prompt}]
    )
    
    # Extract the JSON content from Claude's response
    if response.content[0].type == 'text':
        content = response.content[0].text
        if not content:
            raise Exception("Empty response from Claude")
        
        # Extract JSON from the response
        json_match = re.search(r'\[[\s\S]*\]', content)
        json_str = json_match.group(0) if json_match else content
        
        # Parse the JSON response
        return json.loads(json_str)
    else:
        raise Exception("Unexpected response format from Claude")

def regenerate_typography(brand_name, industry, description, values, design_style, existing_colors, anthropic_client):
    """Regenerate typography for a brand using Claude"""
    # Extract values as text
    values_text = ", ".join([v.get('value') for v in values]) if values else ""
    
    # Extract colors as text for context
    colors_text = ", ".join([f"{c.get('name')} ({c.get('hex')})" for c in existing_colors]) if existing_colors else ""
    
    # Create a prompt for Claude to generate new typography
    prompt = f"""
    You are a typography expert. Select the perfect font pairing for the following brand:
    
    Brand Name: {brand_name}
    Industry: {industry}
    Description: {description}
    Values: {values_text}
    Design Style: {design_style}
    Brand Colors: {colors_text}
    
    Recommend two fonts:
    1. A heading font that captures the brand's personality
    2. A body text font that is highly readable and complements the heading font
    
    Choose fonts that are widely available and appropriate for the brand's character.
    
    Respond ONLY with a JSON object in this exact format:
    {{
        "headings": "Heading Font Name",
        "body": "Body Font Name"
    }}
    
    No additional text or explanation.
    """
    
    # Call Claude to generate new typography
    response = anthropic_client.messages.create(
        model="claude-3-7-sonnet-20250219",
        max_tokens=1000,
        temperature=0.7,
        system="You are a professional typography designer who specializes in brand font selection. Output only valid JSON with no additional text.",
        messages=[{"role": "user", "content": prompt}]
    )
    
    # Extract the JSON content from Claude's response
    if response.content[0].type == 'text':
        content = response.content[0].text
        if not content:
            raise Exception("Empty response from Claude")
        
        # Extract JSON from the response
        json_match = re.search(r'\{[\s\S]*\}', content)
        json_str = json_match.group(0) if json_match else content
        
        # Parse the JSON response
        return json.loads(json_str)
    else:
        raise Exception("Unexpected response format from Claude")

def regenerate_logo(brand_name, industry, description, values, design_style, existing_colors, replicate_client):
    """Regenerate logo for a brand using FLUX AI via Replicate"""
    # Extract values as text
    values_text = ", ".join([v.get('value') for v in values]) if values else ""
    
    # Extract colors
    primary_color = "#1E40AF"  # Default blue
    secondary_color = "#F97316"  # Default orange
    accent_color = "#FFFFFF"  # Default white
    
    for color in existing_colors:
        if color.get("type") == "primary":
            primary_color = color.get("hex", primary_color)
        elif color.get("type") == "secondary":
            secondary_color = color.get("hex", secondary_color)
        elif color.get("type") == "accent":
            accent_color = color.get("hex", accent_color)
    
    # Create the prompt for FLUX
    prompt = f"""
    Design a professional, modern logo for {brand_name}.
    Industry: {industry}
    Description: {description}
    Values: {values_text}
    Style: {design_style}
    
    Use these exact colors in the design:
    - Primary color: {primary_color}
    - Secondary color: {secondary_color}
    - Accent color: {accent_color}
    
    Create a clean, memorable, and scalable logo that works well at different sizes.
    The logo should have a distinctive shape and avoid using complex details.
    Do not include any text in the logo design itself.
    """
    
    # In a real implementation, this would call FLUX via Replicate
    # For this example, we'll return placeholder SVGs
    
    # Create a simple placeholder SVG for demonstration
    primary_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <circle cx="100" cy="100" r="80" fill="{primary_color}"/>
        <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="{secondary_color}"/>
        <circle cx="100" cy="100" r="30" fill="{accent_color}"/>
    </svg>'''
    
    # Create monochrome version
    monochrome_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <circle cx="100" cy="100" r="80" fill="#333333"/>
        <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="#666666"/>
        <circle cx="100" cy="100" r="30" fill="#FFFFFF"/>
    </svg>'''
    
    # Create reverse version
    reverse_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <circle cx="100" cy="100" r="80" fill="{accent_color}"/>
        <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="{accent_color}"/>
        <circle cx="100" cy="100" r="30" fill="{primary_color}"/>
    </svg>'''
    
    return {
        "primary": primary_svg,
        "monochrome": monochrome_svg,
        "reverse": reverse_svg
    }

def regenerate_tagline(brand_name, industry, description, values, design_style, anthropic_client):
    """Regenerate tagline for a brand using Claude"""
    # Extract values as text
    values_text = ", ".join([v.get('value') for v in values]) if values else ""
    
    # Create a prompt for Claude to generate a new tagline
    prompt = f"""
    You are a tagline expert. Create a memorable tagline for the following brand:
    
    Brand Name: {brand_name}
    Industry: {industry}
    Description: {description}
    Values: {values_text}
    Design Style: {design_style}
    
    Create a concise, memorable tagline that:
    - Captures the brand's essence and value proposition
    - Is no more than 5-7 words
    - Is unique and distinctive
    - Aligns with the brand values
    
    Respond with ONLY the tagline itself as a plain text string. No quotation marks, no explanations.
    """
    
    # Call Claude to generate a new tagline
    response = anthropic_client.messages.create(
        model="claude-3-7-sonnet-20250219",
        max_tokens=100,
        temperature=0.7,
        system="You are a professional brand strategist who specializes in creating memorable taglines. Return only the tagline with no additional text.",
        messages=[{"role": "user", "content": prompt}]
    )
    
    # Extract the tagline from Claude's response
    if response.content[0].type == 'text':
        tagline = response.content[0].text.strip()
        if not tagline:
            raise Exception("Empty response from Claude")
        
        return tagline
    else:
        raise Exception("Unexpected response format from Claude")