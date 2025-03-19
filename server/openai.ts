import Anthropic from "@anthropic-ai/sdk";
import Replicate from "replicate";
import OpenAI from "openai";
import { BrandInput } from "@shared/schema";

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Using latest Claude model
const CLAUDE_MODEL = "claude-3-5-sonnet-20240620";

// Random value between 0.3 and 0.9 to add variability to responses
// (Claude API requires temperature between 0 and 1)
const getRandomTemperature = (): number => 0.3 + Math.random() * 0.6;

// Initialize Anthropic with API key from environment
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Replicate with API key from environment for Black Forest Flux
export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Helper function to generate logos based on parameters using FLUX schnell model
export const generateLogo = async (params: {
  brandName: string,
  industry: string,
  description: string,
  values: string[],
  style: string,
  colors: string[],
  promptOverride?: string // Optional parameter to allow users to edit the prompt directly
}): Promise<{svg: string, prompt: string}> => {
  const { brandName, industry, description, values, style, colors, promptOverride } = params;
  
  // Generate a unique timestamp seed to make each request different
  const uniqueSeed = Date.now() % 1000;
  
  // We need to thoroughly sanitize description to prevent NSFW content triggers
  let sanitizedDescription = description;
  
  // List of sensitive terms that might trigger content filters
  const sensitiveTerms = [
    "bdsm", "sex", "adult", "erotic", "fetish", "kinky", 
    "bondage", "slave", "dom", "sub", "flog", "whip", 
    "leather", "nsfw", "xxx", "pleasure", "toy", "sensual"
  ];
  
  // Check if any sensitive terms are in the description (if description exists)
  const hasSensitiveContent = description && sensitiveTerms.some(term => 
    description.toLowerCase().includes(term)
  );
  
  // If sensitive content detected, replace with a sanitized version
  if (hasSensitiveContent) {
    sanitizedDescription = `A premium lifestyle brand focused on aesthetic appeal, quality, and elegance. Creating luxury accessories for discerning customers who value innovation, craftsmanship and quality materials.`;
  }
  
  // If we have a prompt override, use it directly
  let fluxPrompt = promptOverride;
  
  // If there's no prompt override, generate a new prompt
  if (!fluxPrompt) {
    // First, get logo design ideas from Claude
    const designPrompt = `
      Create a detailed description for a unique and creative logo for a brand with the following details:
      - Brand Name: ${brandName}
      - Industry: ${industry || "Lifestyle products"}
      - Description: ${sanitizedDescription}
      - Values: ${values.join(', ')}
      - Style: ${style}
      - Color Preferences: ${colors.length > 0 ? colors.join(', ') : 'Choose appropriate colors based on the brand personality'}
      - Unique design seed: ${uniqueSeed}
      
      Your output will be used as input to generate the actual logo.
      Be innovative and original with this design. Create something that stands out and is memorable.
      The logo should be professional, visually striking, and perfectly reflect the brand's identity.
      
      Important: Focus only on abstract design elements that are suitable for public display. Create a tasteful, modern, elegant logo that would be appropriate for a high-end lifestyle brand.
      
      Focus on:
      1. The overall shape and concept (abstract, geometric, elegant)
      2. Specific colors (with hex codes) that convey sophistication
      3. Detailed description of graphical elements (curves, lines, shapes)
      4. Typography suggestions if text is incorporated
      5. How it relates to the brand's values
      
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
      
      // Create a prompt for the image generation
      fluxPrompt = `
Create a high-quality logo exactly matching this description:

${designDescription}

For brand: ${brandName}
Industry: ${industry || "Lifestyle products"}

IMPORTANT REQUIREMENTS:
- Create EXACTLY what is described in the logo description
- Render in the style of a professional logo with clean lines
- Use the specific colors mentioned in the description
- Include any symbolic elements described (like flowers, shapes, or abstract elements)
- Make sure any text is perfectly legible
- Use a transparent or white background
- Center the logo in the image
- Professional quality suitable for a business brand
- Do not add any watermarks or signatures
- Keep the design tasteful, modern and suitable for public display
      `;
    } catch (error) {
      console.error("Error generating design description:", error);
      // Create a simple prompt if Claude fails
      fluxPrompt = `
Create a modern, professional logo for ${brandName}, a ${industry || "business"} brand.
Style: ${style || "modern and clean"}
Use these colors: ${colors.length > 0 ? colors.join(', ') : 'brand-appropriate colors'}
Incorporate the brand values: ${values.join(', ')}
Make it simple, memorable, and unique.
      `;
    }
  }

  try {
    // Replicate model for logo generation
    console.log("Sending request to Replicate logo generation model with prompt:", fluxPrompt.substring(0, 100) + "...");
    let imageOutput;
    // Try to create a logo using Replicate models, with fallbacks
    try {
      // First attempt with prediction directly - using API version format
      try {
        console.log("Trying to use Replicate with black-forest-labs/flux-schnell model");
        const prediction = await replicate.predictions.create({
          version: "d99d8f1775c65bcfdff0b5d4bbc2b51782a013e351ea902e2926390c2b6eca66",
          input: {
            prompt: fluxPrompt,
            width: 1024,
            height: 1024,
            negative_prompt: "low quality, distorted, ugly, bad proportions, text errors, text cut off, spelling errors, nsfw, provocative, inappropriate, sexual, adult content",
            num_outputs: 1,
            num_inference_steps: 20
          },
        });
        
        // Wait for the prediction to complete
        const result = await replicate.wait(prediction);
        console.log("Replicate prediction completed:", result);
        imageOutput = result.output;
      } catch (error) {
        console.error("First Replicate attempt failed, trying alternative approach:", error);
        
        // Try alternative model - SD 3
        try {
          console.log("Trying alternative model: stabilityai/stable-diffusion-3");
          const prediction = await replicate.predictions.create({
            version: "539ae36668f741dce42bd3b5fa2af5a7a671ae2b80fb373e4526d508b488f981", // SD3 medium
            input: {
              prompt: fluxPrompt,
              width: 1024,
              height: 1024,
              negative_prompt: "low quality, distorted, ugly, bad proportions, text errors, text cut off, spelling errors"
            },
          });
          
          // Wait for the prediction to complete
          const result = await replicate.wait(prediction);
          console.log("Alternative model prediction completed:", result);
          imageOutput = result.output;
        } catch (secondError) {
          // If both fail, use simple SVG fallback
          console.error("All Replicate models failed, using fallback SVG generator:", secondError);
          return {
            svg: createFallbackLogo(brandName, colors.length > 0 ? colors : ['#3366CC', '#FF9900']),
            prompt: fluxPrompt
          };
        }
      }
    } catch (outerError) {
      console.error("Unexpected error in Replicate processing:", outerError);
      return {
        svg: createFallbackLogo(brandName, colors.length > 0 ? colors : ['#3366CC', '#FF9900']),
        prompt: fluxPrompt
      };
    }

    // Replicate typically returns an array of image URLs
    // Let's grab the first one (or the output if it's a string)
    const imageUrl = Array.isArray(imageOutput) ? imageOutput[0] : String(imageOutput);
    
    // For our purposes, we'll return an SVG wrapper that embeds the generated image
    // This allows us to maintain compatibility with our existing code
    if (imageUrl) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 200">
        <image href="${imageUrl}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
      </svg>`;
      
      return {
        svg,
        prompt: fluxPrompt // Return the prompt so users can edit it
      };
    }
    
    // Fallback SVG if image generation fails
    return {
      svg: createFallbackLogo(brandName, colors),
      prompt: fluxPrompt
    };
  } catch (error) {
    console.error("Error generating logo:", error);
    // Return a fallback logo
    return {
      svg: createFallbackLogo(brandName, colors),
      prompt: fluxPrompt
    };
  }
};

// Helper to create a fallback logo when generation fails
function createFallbackLogo(brandName: string, colors: string[]): string {
  // Get first letter of the brand name
  const initial = brandName.charAt(0).toUpperCase();
  
  // Pick a color - either the first one provided or a default
  const primaryColor = colors && colors.length > 0 ? colors[0] : '#10B981';
  const secondaryColor = colors && colors.length > 1 ? colors[1] : '#0891B2';
  
  // Create a simple circular logo with the first letter
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 200">
    <circle cx="100" cy="100" r="90" fill="${primaryColor}" />
    <circle cx="100" cy="100" r="70" fill="${secondaryColor}" />
    <text x="100" y="120" font-family="Arial, sans-serif" font-size="80" font-weight="bold" text-anchor="middle" fill="white">${initial}</text>
  </svg>`;
}

// Create a monochrome version of the logo by replacing image with a grayscale version
export function generateMonochromeLogo(logoSvg: string): string {
  // If the logo is an SVG with an embedded image
  if (logoSvg.includes('<image href="')) {
    // Extract the image URL
    const imageUrlMatch = logoSvg.match(/href="([^"]+)"/);
    const imageUrl = imageUrlMatch ? imageUrlMatch[1] : '';
    
    if (imageUrl) {
      // Return an SVG with the same image but with a grayscale filter applied
      return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 200">
        <filter id="grayscale">
          <feColorMatrix type="matrix" values="0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0"/>
        </filter>
        <image href="${imageUrl}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" filter="url(#grayscale)"/>
      </svg>`;
    }
  }
  
  // For fallback logos or if there's no image URL, create a manual grayscale version
  return logoSvg.replace(/#[0-9a-fA-F]{3,6}/g, '#333333');
}

// Create a reverse color version of the logo (light on dark)
export function generateReverseLogo(logoSvg: string): string {
  // If the logo is an SVG with an embedded image
  if (logoSvg.includes('<image href="')) {
    // Extract the image URL
    const imageUrlMatch = logoSvg.match(/href="([^"]+)"/);
    const imageUrl = imageUrlMatch ? imageUrlMatch[1] : '';
    
    if (imageUrl) {
      // Return an SVG with the same image but with an invert filter applied
      return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#111111"/>
        <filter id="invert">
          <feColorMatrix type="matrix" values="-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0"/>
        </filter>
        <image href="${imageUrl}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" filter="url(#invert)"/>
      </svg>`;
    }
  }
  
  // For fallback logos or if there's no image URL, create a simple inverted version
  return logoSvg
    .replace(/#[0-9a-fA-F]{3,6}/g, (match) => {
      // Simple inversion - replace with a dark color for light colors and vice versa
      return match === '#FFFFFF' || match === '#ffffff' ? '#111111' : '#FFFFFF';
    })
    .replace(/fill="white"/g, 'fill="black"');
}

// Generate brand concept with Claude
export const generateBrandConcept = async (brandInput: BrandInput) => {
  console.log("Starting brand concept generation with input:", JSON.stringify(brandInput));
  // Generate a unique timestamp seed to ensure different results each time
  const uniqueSeed = Date.now() % 1000;
  const varietyFactor = Math.floor(Math.random() * 10); // Random number between 0-9
  
  // Sanitize the description to prevent content moderation issues
  let sanitizedDescription = brandInput.description;
  
  // List of sensitive terms that might trigger content filters
  const sensitiveTerms = [
    "bdsm", "sex", "adult", "erotic", "fetish", "kinky", 
    "bondage", "slave", "dom", "sub", "flog", "whip", 
    "leather", "nsfw", "xxx", "pleasure", "toy", "sensual"
  ];
  
  // Check if any sensitive terms are in the description
  const hasSensitiveContent = sensitiveTerms.some(term => 
    brandInput.description.toLowerCase().includes(term)
  );
  
  // If sensitive content detected, replace with a sanitized version
  if (hasSensitiveContent) {
    sanitizedDescription = `A premium lifestyle brand focused on aesthetic appeal, quality, and elegance. Creating luxury accessories for discerning customers who value innovation, craftsmanship and quality materials.`;
  }
  
  const prompt = `
    Generate a fresh, original, and comprehensive brand identity for a company with the following details:
    - Brand Name: ${brandInput.brandName}
    - Industry: ${brandInput.industry || 'General business'}
    - Description: ${sanitizedDescription}
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
    
    // Generate a logo using the brand input (with sanitized description)
    const { svg: logoSvg, prompt: logoPrompt } = await generateLogo({
      brandName: brandInput.brandName,
      industry: brandInput.industry,
      description: sanitizedDescription, // Use the sanitized description
      values: brandInput.values.map(v => v.value),
      style: brandInput.designStyle,
      colors: brandInput.colorPreferences || []
    });
    
    // Generate monochrome and reverse versions of the logo from the SVG string
    const monochromeLogo = generateMonochromeLogo(logoSvg);
    const reverseLogo = generateReverseLogo(logoSvg);
    
    // Return a properly formatted brand concept with the logo prompt for editing
    return {
      logo: {
        primary: logoSvg,
        monochrome: monochromeLogo,
        reverse: reverseLogo,
        prompt: logoPrompt // Store the prompt used to generate the logo
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