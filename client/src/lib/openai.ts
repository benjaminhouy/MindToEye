// Client-side API wrapper for brand generation
// All AI functionality will be handled server-side for security reasons

import { BrandInput } from "@shared/schema";
import { apiRequest } from "./queryClient";

// Helper function to generate SVG logos based on parameters
export const generateLogo = async (params: {
  brandName: string,
  industry: string,
  description: string,
  values: string[],
  style: string,
  colors: string[]
}) => {
  try {
    const response = await apiRequest("POST", "/api/generate-logo", params);
    const data = await response.json();
    return data.logo;
  } catch (error) {
    console.error("Error generating logo:", error);
    throw new Error("Failed to generate logo");
  }
};

// Generate brand concept with AI
export const generateBrandConcept = async (brandInput: BrandInput) => {
  try {
    const response = await apiRequest("POST", "/api/generate-concept", brandInput);
    const data = await response.json();
    return data.brandOutput;
  } catch (error) {
    console.error("Error generating brand concept:", error);
    throw new Error("Failed to generate brand concept");
  }
};
