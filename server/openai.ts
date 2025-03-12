import Anthropic from "@anthropic-ai/sdk";
import Replicate from "replicate";
import { BrandInput } from "@shared/schema";

// Using Claude Sonnet 3.5 model from Anthropic as requested
const CLAUDE_MODEL = "claude-3-sonnet-20240229";

// Random value between 0.3 and 0.9 to add variability to responses
// (Claude API requires temperature between 0 and 1)
const getRandomTemperature = () => 0.3 + Math.random() * 0.6;

// Initialize Anthropic with API key from environment
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Replicate with API key from environment for Black Forest Flux
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Helper function to generate logos based on parameters using Black Forest Flux
export const generateLogo = async (params: {
  brandName: string,
  industry: string,
  description: string,
  values: string[],
  style: string,
  colors: string[]
}) => {
  const { brandName, industry, description, values, style, colors } = params;
  
  // Generate a unique timestamp seed to make each request different
  const uniqueSeed = Date.now() % 1000;
  
  // First, get logo design ideas from Claude
  const designPrompt = `
    Create a detailed description for a unique and creative logo for a brand with the following details:
    - Brand Name: ${brandName}
    - Industry: ${industry}
    - Description: ${description}
    - Values: ${values.join(', ')}
    - Style: ${style}
    - Color Preferences: ${colors.length > 0 ? colors.join(', ') : 'Choose appropriate colors based on the brand personality'}
    - Unique design seed: ${uniqueSeed}
    
    Your output will be used as input to generate the actual logo.
    Be innovative and original with this design. Create something that stands out and is memorable.
    The logo should be professional, visually striking, and perfectly reflect the brand's identity.
    
    Focus on:
    1. The overall shape and concept
    2. Specific colors (with hex codes)
    3. Detailed description of graphical elements
    4. Typography suggestions if text is incorporated
    5. How it relates to the brand's values and industry
    
    Your description should be 2-3 paragraphs, detailed enough for an AI image generator to create a high-quality logo.
  `;

  try {
    const designResponse = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      temperature: getRandomTemperature(),
      messages: [
        { 
          role: "user", 
          content: designPrompt 
        }
      ],
    });

    // Extract the design description 
    let designDescription = '';
    if (designResponse.content[0].type === 'text') {
      designDescription = designResponse.content[0].text;
    }
    
    if (!designDescription) {
      throw new Error("Failed to generate logo design description");
    }
    
    // Create a prompt for Black Forest Flux (via Replicate)
    const fluxPrompt = `
Design a professional, minimal logo for ${brandName}, a ${industry} brand.

${designDescription}

The logo should be:
- Clean and simple, using a minimal design approach 
- Vector-style with clear shapes
- Simple enough to be recognized at small sizes
- Use a white or transparent background
- Include both icon and text elements carefully positioned
- Professional quality suitable for a business

Important formatting requirements:
- Logo is centered in the image
- Use negative space effectively
- No borders or additional elements  
- Logo should work well in both color and black/white
    `;

    // Black Forest Labs Flux model on Replicate
    const output = await replicate.run(
      "blackforestlabs/flux:bd7a3cc38bc55e4e2b5881fbff6b0db448be246c7a5bfed7fc0ee23a87423db6",
      {
        input: {
          prompt: fluxPrompt,
          width: 1024,
          height: 1024,
          scheduler: "K_EULER",
          num_inference_steps: 50,
          guidance_scale: 7.5
        }
      }
    );

    // Replicate typically returns an array of image URLs
    // Let's grab the first one (or the output if it's a string)
    const imageUrl = Array.isArray(output) ? output[0] : output;
    
    // For our purposes, we'll return an SVG wrapper that embeds the generated image
    // This allows us to maintain compatibility with our existing code
    if (imageUrl) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <image href="${imageUrl}" width="200" height="200" preserveAspectRatio="xMidYMid meet"/>
      </svg>`;
    }
    
    // Fallback SVG if image generation fails
    return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" stroke="#10B981" stroke-width="8" fill="white"/><path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM135 110H110V135C110 140.52 105.52 145 100 145C94.48 145 90 140.52 90 135V110H65C59.48 110 55 105.52 55 100C55 94.48 59.48 90 65 90H90V65C90 59.48 94.48 55 100 55C105.52 55 110 59.48 110 65V90H135C140.52 90 145 94.48 145 100C145 105.52 140.52 110 135 110Z" fill="#10B981"/></svg>';
  } catch (error) {
    console.error("Error generating logo:", error);
    throw new Error("Failed to generate logo");
  }
};

// Generate brand concept with Claude
export const generateBrandConcept = async (brandInput: BrandInput) => {
  // Generate a unique timestamp seed to ensure different results each time
  const uniqueSeed = Date.now() % 1000;
  const varietyFactor = Math.floor(Math.random() * 10); // Random number between 0-9
  
  const prompt = `
    Generate a fresh, original, and comprehensive brand identity for a company with the following details:
    - Brand Name: ${brandInput.brandName}
    - Industry: ${brandInput.industry || 'General business'}
    - Description: ${brandInput.description}
    - Values: ${brandInput.values.map(v => v.value).join(', ')}
    - Design Style: ${brandInput.designStyle}
    - Color Preferences: ${brandInput.colorPreferences?.length ? brandInput.colorPreferences.join(', ') : 'Open to creative suggestions'}
    - Unique design seed: ${uniqueSeed}
    - Variety factor: ${varietyFactor} (use this to influence your creative direction - higher numbers mean more bold/experimental designs)
    
    Create something truly unique - avoid generic or commonly used design elements.
    You're designing for seed #${uniqueSeed}, so make this concept different from any others you've created.
    
    Be flexible with interpreting the industry and color preferences - they may be specific or vague descriptors.
    If color preferences are vague (like "earthy" or "vibrant"), interpret them creatively.
    
    Include the following in your response:
    1. A distinctive color palette with 4-5 colors (primary, secondary, accent, and base colors)
    2. Typography recommendations (heading and body fonts) that perfectly match the brand personality
    3. A creative and memorable logo concept description
    
    Format your response as a structured JSON object with these fields (and nothing else):
    {
      "colors": [
        { "name": "Primary", "hex": "#hex", "type": "primary" },
        { "name": "Secondary", "hex": "#hex", "type": "secondary" },
        { "name": "Accent", "hex": "#hex", "type": "accent" },
        { "name": "Base", "hex": "#hex", "type": "base" }
      ],
      "typography": {
        "headings": "Font Name",
        "body": "Font Name"
      },
      "logoDescription": "Description of the logo concept"
    }
    
    Return only the JSON object with no additional text before or after.
  `;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      temperature: getRandomTemperature(), // Add temperature for variability
      system: "You are a skilled brand identity designer. Provide detailed brand concepts in JSON format only. Be creative and varied with your designs. Every time you're called, generate something different and unique.",
      messages: [{ role: "user", content: prompt }],
    });

    // Check if the response has content of type "text"
    let jsonStr = '';
    if (response.content[0].type === 'text') {
      const content = response.content[0].text;
      if (!content) throw new Error("Empty response from Claude");
      
      // Extract JSON from the response (Claude might add backticks or markdown formatting)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      jsonStr = jsonMatch ? jsonMatch[0] : content;
    } else {
      throw new Error("Unexpected response format from Claude");
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Generate a logo using the brand input
    const logoSvg = await generateLogo({
      brandName: brandInput.brandName,
      industry: brandInput.industry,
      description: brandInput.description,
      values: brandInput.values.map(v => v.value),
      style: brandInput.designStyle,
      colors: brandInput.colorPreferences || []
    });
    
    // Return a properly formatted brand concept
    return {
      logo: {
        primary: logoSvg,
        monochrome: "",  // To be implemented
        reverse: ""      // To be implemented
      },
      colors: parsed.colors || [
        { name: "Primary", hex: "#10B981", type: "primary" },
        { name: "Secondary", hex: "#0F766E", type: "secondary" },
        { name: "Accent", hex: "#38BDF8", type: "accent" },
        { name: "Base", hex: "#1F2937", type: "base" }
      ],
      typography: parsed.typography || {
        headings: "Montserrat",
        body: "Open Sans"
      },
      mockups: [],
      logoDescription: parsed.logoDescription || "Modern and minimalist logo design"
    };
  } catch (error) {
    console.error("Error generating brand concept with Claude:", error);
    throw error;
  }
};