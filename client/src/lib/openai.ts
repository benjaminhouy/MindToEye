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
    let previousIncomplete = '';
    let receivedFirstResponse = false;
    let lastProgress = 0;
    
    // Process the stream chunks
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // If we're done and haven't hit 100% yet, set to 100%
        onProgress?.(100);
        break;
      }
      
      // Convert the chunk to string
      const chunkText = new TextDecoder().decode(value);
      result += chunkText;
      
      // Combine with any previously incomplete chunk
      const chunk = previousIncomplete + chunkText;
      previousIncomplete = '';
      
      // Split by possible complete JSON objects
      const objects = chunk.split('}{');
      
      // Process each potential JSON object in the chunk
      for (let i = 0; i < objects.length; i++) {
        let objStr = objects[i];
        
        // Add the brackets back except for first and last item 
        // which may be incomplete
        if (i > 0) objStr = '{' + objStr;
        if (i < objects.length - 1) objStr = objStr + '}';
        
        // If this is the last object and we're not done, it might be incomplete
        if (i === objects.length - 1 && !done) {
          previousIncomplete = objStr;
          continue;
        }
        
        // Try to parse as JSON
        try {
          const data = JSON.parse(objStr);
          
          // Check for progress updates
          if (data.progress && typeof data.progress === 'number') {
            const progressValue = Math.max(lastProgress, data.progress);
            if (progressValue > lastProgress) {
              console.log(`Generation progress: ${progressValue}%`);
              onProgress?.(progressValue);
              lastProgress = progressValue;
            }
          }
          
          // If this is a status update
          if (data.status) {
            // Initial processing notification
            if (data.status === "processing" && !receivedFirstResponse) {
              receivedFirstResponse = true;
              onProgress?.(10);
              console.log("Generation process started");
            } 
            // Progress update
            else if (data.status === "progress" && data.progress) {
              const progressValue = Math.max(lastProgress, data.progress);
              console.log(`Explicit progress update: ${progressValue}%`);
              onProgress?.(progressValue);
              lastProgress = progressValue;
            }
            // Final result with complete data
            else if (data.status === "complete" && data.success && data.brandOutput) {
              // Complete the progress
              onProgress?.(100);
              console.log("Generation complete, returning brand output");
              return data.brandOutput;
            }
          }
          
          // If we have brandOutput in any format
          if (data.brandOutput) {
            onProgress?.(100);
            console.log("Received brand output");
            return data.brandOutput;
          }
          
          // For error responses
          if (data.status === "error" || (data.success === false && data.error)) {
            throw new Error(data.message || data.error || "Failed to generate brand concept");
          }
        } catch (e) {
          // Non-critical error, might be an incomplete JSON chunk
          if (objStr.trim()) {
            console.log("Couldn't parse JSON chunk, may be incomplete");
          }
        }
      }
      
      // Implement a simple artificial progress that moves forward
      // This ensures the progress bar keeps moving even if we don't get explicit updates
      if (onProgress && lastProgress < 90) {
        // Gently increase progress if we haven't received an update
        const artificialProgress = Math.min(85, lastProgress + 1);
        if (artificialProgress > lastProgress) {
          lastProgress = artificialProgress;
          onProgress(artificialProgress);
        }
      }
    }
    
    // If we reach here, we need to try to extract a complete response from everything we received
    console.log("Trying to extract final result from complete response...");
    
    // Process the complete result if we couldn't parse individual chunks
    try {
      // Look for complete JSON objects
      const jsonRegex = /\{(?:[^{}]|(\{(?:[^{}]|(\{(?:[^{}]|(\{[^{}]*\}))*\}))*\}))*\}/g;
      
      // Get all matches but compatible with older ES versions
      const matches: RegExpExecArray[] = [];
      let match: RegExpExecArray | null;
      while ((match = jsonRegex.exec(result)) !== null) {
        matches.push(match);
      }
      
      // Try each match, starting with the last (most likely to be complete)
      for (let i = matches.length - 1; i >= 0; i--) {
        try {
          const match = matches[i][0];
          const data = JSON.parse(match);
          
          if (data.brandOutput) {
            console.log(`Successfully parsed JSON match ${i+1} of ${matches.length}`);
            return data.brandOutput;
          }
        } catch (e) {
          console.log(`Failed to parse match ${i+1}`);
        }
      }
      
      // If no matches worked, try our last resort approach
      // Find the last occurrence of {"brandOutput":
      const brandOutputStart = result.lastIndexOf('{"brandOutput"');
      if (brandOutputStart >= 0) {
        // Try to find where this object ends by balancing braces
        let braceCount = 1;
        let endPos = -1;
        
        for (let i = brandOutputStart + 1; i < result.length; i++) {
          if (result[i] === '{') braceCount++;
          if (result[i] === '}') braceCount--;
          
          if (braceCount === 0) {
            endPos = i + 1;
            break;
          }
        }
        
        if (endPos > 0) {
          const potentialJson = result.substring(brandOutputStart, endPos);
          
          try {
            const data = JSON.parse(potentialJson);
            if (data.brandOutput) {
              console.log("Successfully extracted brandOutput using brace balancing");
              return data.brandOutput;
            }
          } catch (e) {
            console.error("Failed to parse extracted JSON:", e);
          }
        }
      }
    } catch (e) {
      console.error("Error in final parsing attempts:", e);
    }
    
    // Last resort - return a more helpful error with debugging info
    console.error("All JSON parsing attempts failed. Response preview:", 
      result.substring(0, 500) + (result.length > 500 ? '...' : ''));
    
    throw new Error(
      "Could not parse response from server. The AI service may have returned malformed data. " +
      "Please try again or contact support if this issue persists."
    );
  } catch (error) {
    console.error("Error generating brand concept:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate brand concept");
  }
};
