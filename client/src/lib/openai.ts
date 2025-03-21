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
        // If we're done and haven't hit 100% yet, set to 100%
        onProgress?.(100);
        break;
      }
      
      // Convert the chunk to string
      const chunk = new TextDecoder().decode(value);
      result += chunk;
      
      chunks++;
      
      // Implement a simple artificial progress that moves forward
      // even if we don't have concrete progress from the server
      if (onProgress) {
        // Even if we can't parse the chunk, we'll still show progress increasing
        // Start at 10%, simulate progress up to 90% during processing
        const artificialProgress = Math.min(90, 10 + ((chunks * 5) % 80));
        onProgress(artificialProgress);
        console.log(`Updating progress to ${artificialProgress}%`);
      }
      
      // Try to parse the JSON when we have complete chunks
      try {
        // Look for progress indicators in the raw chunk first
        if (chunk.includes("progress")) {
          const progressMatch = chunk.match(/progress["\s:]+(\d+)/);
          if (progressMatch && progressMatch[1]) {
            const progressValue = parseInt(progressMatch[1], 10);
            if (!isNaN(progressValue) && progressValue > 0) {
              console.log(`Generation progress: ${progressValue}%`);
              onProgress?.(progressValue);
            }
          }
        }
        
        // Try to parse as JSON
        const data = JSON.parse(chunk);
        
        // If this is the first response (the "processing" notification)
        if (data.status === "processing" && !receivedFirstResponse) {
          receivedFirstResponse = true;
          // Start at 10% progress
          onProgress?.(10);
          console.log("Generation process started");
        } 
        // For the final response with the brand output
        else if (data.status === "complete" && data.success) {
          // Complete the progress
          onProgress?.(100);
          console.log("Generation complete, returning brand output");
          return data.brandOutput;
        }
        // If we got a brand output without status flags
        else if (data.brandOutput) {
          onProgress?.(100);
          console.log("Received brand output directly");
          return data.brandOutput;
        }
        // For error responses
        else if (!data.success) {
          throw new Error(data.message || "Failed to generate brand concept");
        }
      } catch (e) {
        // This might happen if we get a partial JSON chunk
        // Just continue and try to parse the next chunk
        console.log("Received partial data chunk, continuing...");
      }
    }
    
    // Process the complete result if we couldn't parse individual chunks
    try {
      // First try to find a complete JSON response with a regex
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      let possibleJsonString = '';
      
      if (jsonMatch) {
        possibleJsonString = jsonMatch[0];
        console.log("Found potential JSON object with regex");
      } else {
        // If that fails, look for the last opening brace
        const lastJsonStart = result.lastIndexOf('{');
        if (lastJsonStart !== -1) {
          possibleJsonString = result.substring(lastJsonStart);
          console.log("Extracted JSON from last opening brace");
        }
      }
      
      // If we found something that might be JSON
      if (possibleJsonString) {
        // Try to parse it directly
        try {
          const finalData = JSON.parse(possibleJsonString);
          if (finalData.success && finalData.brandOutput) {
            console.log("Successfully parsed final JSON response");
            return finalData.brandOutput;
          } else if (finalData.brandOutput) {
            // If success flag is missing but we have brand output
            console.log("Found brandOutput without success flag");
            return finalData.brandOutput;
          }
        } catch (jsonError) {
          console.error("Error parsing extracted JSON:", jsonError);
          
          // Try to fix common JSON issues
          let fixedJson = possibleJsonString
            .replace(/'/g, '"')  // Replace single quotes with double quotes
            .replace(/\,\s*\}/g, '}')  // Remove trailing commas
            .replace(/\,\s*\]/g, ']'); // Remove trailing commas in arrays
            
          try {
            const finalData = JSON.parse(fixedJson);
            if (finalData.brandOutput) {
              console.log("Successfully parsed fixed JSON");
              return finalData.brandOutput;
            }
          } catch (fixError) {
            console.error("Error parsing fixed JSON:", fixError);
          }
        }
      }
    } catch (e) {
      console.error("Error in final parsing attempt:", e);
    }
    
    // Log the entire response for debugging
    console.error("All JSON parsing attempts failed. First 200 chars of response:", 
      result.substring(0, 200) + (result.length > 200 ? '...' : ''));
    
    throw new Error("Could not parse response from server. Please try again.");
  } catch (error) {
    console.error("Error generating brand concept:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate brand concept");
  }
};
