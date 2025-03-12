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

// Generate brand concept with AI - handles long-running process with streaming response
export const generateBrandConcept = async (brandInput: BrandInput, onProgress?: (progress: number) => void) => {
  try {
    // Start the brand concept generation process
    const response = await fetch('/api/generate-concept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(brandInput),
    });
    
    // Get the reader for the response stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Stream reader not available");
    }
    
    // Process the streamed response
    let result = '';
    let receivedFirstResponse = false;
    let chunks = 0;
    
    // Process the stream chunks
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      // Convert the chunk to string
      const chunk = new TextDecoder().decode(value);
      result += chunk;
      
      chunks++;
      
      // Parse the JSON when we have complete chunks
      try {
        const data = JSON.parse(chunk);
        
        // If this is the first response (the "processing" notification)
        if (data.status === "processing" && !receivedFirstResponse) {
          receivedFirstResponse = true;
          // Start at 10% progress
          onProgress?.(10);
        } 
        // For the final response with the brand output
        else if (data.status === "complete" && data.success) {
          // Complete the progress
          onProgress?.(100);
          return data.brandOutput;
        }
        // For error responses
        else if (!data.success) {
          throw new Error(data.message || "Failed to generate brand concept");
        }
        
        // Update progress periodically during processing
        if (receivedFirstResponse && chunks % 2 === 0) {
          // Increment progress from 10% to 90% during processing
          const progress = Math.min(90, 10 + (chunks * 5));
          onProgress?.(progress);
        }
      } catch (e) {
        // This might happen if we get a partial JSON chunk
        // Just continue and try to parse the next chunk
        console.log("Received partial data chunk, continuing...");
      }
    }
    
    // Parse the complete result if we couldn't parse individual chunks
    try {
      const lastJsonStart = result.lastIndexOf('{');
      if (lastJsonStart !== -1) {
        const lastJsonString = result.substring(lastJsonStart);
        const finalData = JSON.parse(lastJsonString);
        if (finalData.success && finalData.brandOutput) {
          return finalData.brandOutput;
        }
      }
    } catch (e) {
      console.error("Error parsing final response:", e);
    }
    
    throw new Error("Could not parse response from server");
  } catch (error) {
    console.error("Error generating brand concept:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate brand concept");
  }
};
