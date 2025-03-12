import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

// Initialize OpenAI with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "demo-api-key",
});

// Helper function to generate SVG logos based on parameters
export const generateLogo = async (params: {
  brandName: string,
  industry: string,
  description: string,
  values: string[],
  style: string,
  colors: string[]
}) => {
  const { brandName, industry, description, values, style, colors } = params;
  
  const prompt = `
    Create an SVG logo for a brand with the following details:
    - Brand Name: ${brandName}
    - Industry: ${industry}
    - Description: ${description}
    - Values: ${values.join(', ')}
    - Style: ${style}
    - Colors: ${colors.join(', ')}
    
    The logo should be simple, professional, and reflect the brand's identity.
    Return ONLY the SVG code without any explanations or markdown formatting.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating logo with OpenAI:", error);
    throw new Error("Failed to generate logo");
  }
};

// Generate brand concept with OpenAI
export const generateBrandConcept = async (brandInput: any) => {
  const prompt = `
    Generate a comprehensive brand identity for a company with the following details:
    - Brand Name: ${brandInput.brandName}
    - Industry: ${brandInput.industry}
    - Description: ${brandInput.description}
    - Values: ${brandInput.values.map((v: any) => v.value).join(', ')}
    - Design Style: ${brandInput.designStyle}
    - Color Preferences: ${brandInput.colorPreferences ? brandInput.colorPreferences.join(', ') : 'Open to suggestions'}
    
    Include the following in your response:
    1. A color palette with 4-5 colors (primary, secondary, accent, and base colors)
    2. Typography recommendations (heading and body fonts)
    3. Logo concept descriptions (no need to generate actual images)
    
    Format your response as a structured JSON object with these fields. Don't include any explanations outside the JSON.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty response from OpenAI");
    
    const parsed = JSON.parse(content);
    
    // Return a properly formatted brand concept
    return {
      logo: {
        primary: "",
        monochrome: "",
        reverse: ""
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
      mockups: []
    };
  } catch (error) {
    console.error("Error generating brand concept with OpenAI:", error);
    // Return default values if API fails
    return {
      logo: {
        primary: "",
        monochrome: "",
        reverse: ""
      },
      colors: [
        { name: "Primary", hex: "#10B981", type: "primary" },
        { name: "Secondary", hex: "#0F766E", type: "secondary" },
        { name: "Accent", hex: "#38BDF8", type: "accent" },
        { name: "Base", hex: "#1F2937", type: "base" }
      ],
      typography: {
        headings: "Montserrat",
        body: "Open Sans"
      },
      mockups: []
    };
  }
};
