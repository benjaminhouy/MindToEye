import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrandConcept, BrandInput } from "@shared/schema";
import { ZapIcon, XIcon } from "lucide-react";
import { nanoid } from "nanoid";
import SavedConcepts from "./SavedConcepts";
import { generateBrandConcept } from "@/lib/openai";
// Type definition matching updated function signature
type GenerateBrandConceptType = (
  brandInput: BrandInput, 
  onProgress?: (progress: number) => void,
  authHeaders?: Record<string, string>
) => Promise<any>;
import { supabase } from "@/lib/supabase";

interface BrandInputPanelProps {
  onGenerate: () => void;
  savedConcepts: BrandConcept[];
  activeConcept: BrandConcept | undefined;
  onConceptSelect: (id: number | null) => void;
  projectId: number;
  projectName?: string; // Optional project name to pre-fill
  onProgressUpdate?: (progress: number) => void; // Optional progress callback
}

const BrandInputPanel = ({ onGenerate, savedConcepts, activeConcept, onConceptSelect, projectId, projectName, onProgressUpdate }: BrandInputPanelProps) => {
  const { toast } = useToast();
  const [brandInput, setBrandInput] = useState<BrandInput>({
    brandName: projectName || "",
    industry: "",
    description: "",
    values: [
      { id: nanoid(), value: "Innovation" },
      { id: nanoid(), value: "Quality" }
    ],
    designStyle: "modern",
    colorPreferences: []
  });
  
  const [newValue, setNewValue] = useState("");
  const [authId, setAuthId] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  
  // Get auth ID and JWT token for API requests
  useEffect(() => {
    const getAuthUser = async () => {
      try {
        // Get the user ID
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          setAuthId(userData.user.id);
          console.log("BrandInputPanel: Auth ID retrieved:", userData.user.id);
        }
        
        // Get the JWT token from the session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token) {
          setJwtToken(sessionData.session.access_token);
          console.log("BrandInputPanel: JWT token retrieved");
        }
      } catch (error) {
        console.error("Error fetching auth user in BrandInputPanel:", error);
      }
    };
    
    getAuthUser();
  }, []);
  
  // Update brandName when projectName changes
  useEffect(() => {
    if (projectName) {
      setBrandInput(prev => ({
        ...prev,
        brandName: projectName
      }));
    }
  }, [projectName]);

  const generateMutation = useMutation({
    mutationFn: async (data: BrandInput) => {
      const response = await apiRequest("POST", "/api/generate-concept", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Save the generated concept
      saveBrandConcept({
        name: `${brandInput.designStyle.charAt(0).toUpperCase() + brandInput.designStyle.slice(1)} ${brandInput.brandName} Concept`,
        brandInputs: brandInput,
        brandOutput: data.brandOutput,
        isActive: true
      });
      
      toast({
        title: "Brand concept generated!",
        description: "Your brand concept has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "There was a problem generating your brand concept. Please try again.",
        variant: "destructive",
      });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Check if we have a valid project ID
      if (!projectId || isNaN(projectId)) {
        throw new Error("Invalid project ID. Please create a project first.");
      }
      const response = await apiRequest("POST", `/api/projects/${projectId}/concepts`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/concepts`] });
      toast({
        title: "Concept saved",
        description: "Your brand concept has been saved successfully.",
      });
    },
    onError: (error) => {
      console.error("Error saving concept:", error);
      toast({
        title: "Save failed",
        description: typeof error === 'object' && error !== null && 'message' in error 
          ? String(error.message) 
          : "There was a problem saving your brand concept. Please make sure you're in a project.",
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBrandInput(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setBrandInput(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (value: string) => {
    // Ensure value is one of the allowed design styles
    const designStyle = (value === "modern" || value === "classic" || value === "minimalist" || value === "bold") 
      ? value 
      : "modern";
    
    setBrandInput(prev => ({ ...prev, designStyle }));
  };

  const handleAddValue = () => {
    if (newValue.trim() === "") return;
    
    setBrandInput(prev => ({
      ...prev,
      values: [...prev.values, { id: nanoid(), value: newValue.trim() }]
    }));
    setNewValue("");
  };

  const handleRemoveValue = (id: string) => {
    setBrandInput(prev => ({
      ...prev,
      values: prev.values.filter(v => v.id !== id)
    }));
  };

  const handleGenerateClick = async () => {
    // Add a unique request ID and projectId for storage organization
    const uniqueBrandInput = {
      ...brandInput,
      requestId: Date.now().toString(), // Add timestamp to ensure uniqueness
      projectId, // Add projectId for storage path organization
      conceptId: Date.now() // Use timestamp as temporary conceptId
    };
    
    console.log(`Generating brand concept with projectId: ${projectId}, temporary conceptId: ${uniqueBrandInput.conceptId}`);
    
    // Start the generation process and show loading overlay
    onGenerate();
    
    try {
      // Prepare auth headers for API requests
      const headers: Record<string, string> = {};
      if (authId) {
        headers['x-auth-id'] = authId;
        console.log("Including auth ID in concept generation:", authId);
      }
      
      // Add JWT token for Supabase storage operations if available
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
        console.log("Including JWT token in Authorization header for Supabase storage operations");
      }
      
      // Use the direct API with progress tracking and auth headers
      const brandOutput = await generateBrandConcept(
        uniqueBrandInput, 
        (progress) => {
          // Report progress to parent if callback exists
          if (onProgressUpdate) {
            onProgressUpdate(progress);
          }
          console.log(`Generation progress: ${progress}%`);
        },
        headers // Pass auth headers to the API call
      );
      
      // If successful, save the concept
      saveBrandConcept({
        name: `${brandInput.designStyle.charAt(0).toUpperCase() + brandInput.designStyle.slice(1)} ${brandInput.brandName} Concept`,
        brandInputs: brandInput,
        brandOutput: brandOutput,
        isActive: true
      });
      
      toast({
        title: "Brand concept generated!",
        description: "Your brand concept has been created successfully.",
      });
      
    } catch (error) {
      console.error("Error generating brand concept:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "There was a problem generating your brand concept. Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveBrandConcept = (conceptData: any) => {
    saveMutation.mutate(conceptData);
  };

  return (
    <>
      <Card className="shadow">
        <CardContent className="pt-5">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Brand Inputs</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="brandName">Brand Name</Label>
              <Input 
                type="text" 
                id="brandName" 
                name="brandName" 
                value={brandInput.brandName} 
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input 
                type="text" 
                id="industry" 
                name="industry" 
                value={brandInput.industry} 
                onChange={handleInputChange}
                className="mt-1"
                placeholder="Enter industry (e.g., Tech, Healthcare, Hospitality)"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Brand Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                rows={3} 
                value={brandInput.description} 
                onChange={handleInputChange} 
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="values">Brand Values</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {brandInput.values.map((valueObj) => (
                  <span 
                    key={valueObj.id} 
                    className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800"
                  >
                    {valueObj.value}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveValue(valueObj.id)}
                      className="ml-1.5 inline-flex flex-shrink-0 h-4 w-4 rounded-full items-center justify-center text-green-700 hover:bg-green-200 hover:text-green-900 focus:outline-none focus:bg-green-500 focus:text-white"
                    >
                      <span className="sr-only">Remove</span>
                      <XIcon className="h-2 w-2" />
                    </button>
                  </span>
                ))}
                <div className="flex">
                  <Input 
                    type="text" 
                    value={newValue} 
                    onChange={(e) => setNewValue(e.target.value)}
                    className="h-7 min-w-[120px] text-sm"
                    placeholder="Add value"
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleAddValue}
                    className="h-7 ml-1"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-gray-700">Design Style</Label>
              <RadioGroup 
                defaultValue="modern" 
                value={brandInput.designStyle}
                onValueChange={handleRadioChange}
                className="mt-1 grid grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="modern" id="modern" />
                  <Label htmlFor="modern" className="text-sm font-normal">Modern</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="classic" id="classic" />
                  <Label htmlFor="classic" className="text-sm font-normal">Classic</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="minimalist" id="minimalist" />
                  <Label htmlFor="minimalist" className="text-sm font-normal">Minimalist</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bold" id="bold" />
                  <Label htmlFor="bold" className="text-sm font-normal">Bold</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="colorPreferences" className="block text-sm font-medium text-gray-700">Color Preferences</Label>
              <Input 
                type="text" 
                id="colorPreferences" 
                name="colorPreferences" 
                className="mt-1"
                placeholder="Describe colors (e.g., earthy tones, vibrant, blue and gold)"
                value={brandInput.colorPreferences?.join(', ') || ''}
                onChange={(e) => {
                  // Split by commas and trim each entry
                  const colorPrefs = e.target.value.split(',').map(color => color.trim()).filter(Boolean);
                  setBrandInput(prev => ({ ...prev, colorPreferences: colorPrefs }));
                }}
              />
              <p className="mt-1 text-sm text-gray-500">
                Be as specific or vague as you'd like. Leave empty for AI to choose colors.
              </p>
            </div>
            
            <div className="pt-3">
              <Button 
                type="button" 
                className="w-full" 
                onClick={handleGenerateClick}
                disabled={generateMutation.isPending}
              >
                <ZapIcon className="mr-2 h-5 w-5" />
                Generate Concepts
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <SavedConcepts 
        concepts={savedConcepts}
        activeConcept={activeConcept}
        onSelect={onConceptSelect}
      />
    </>
  );
};

export default BrandInputPanel;
