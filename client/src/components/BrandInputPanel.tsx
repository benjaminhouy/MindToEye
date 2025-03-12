import { useState } from "react";
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

interface BrandInputPanelProps {
  onGenerate: () => void;
  savedConcepts: BrandConcept[];
  activeConcept: BrandConcept | undefined;
  onConceptSelect: (id: number | null) => void;
  projectId: number;
}

const BrandInputPanel = ({ onGenerate, savedConcepts, activeConcept, onConceptSelect, projectId }: BrandInputPanelProps) => {
  const { toast } = useToast();
  const [brandInput, setBrandInput] = useState<BrandInput>({
    brandName: "EcoVision",
    industry: "Sustainable Technology",
    description: "EcoVision develops sustainable technology solutions that help businesses reduce their carbon footprint while improving operational efficiency.",
    values: [
      { id: nanoid(), value: "Sustainability" },
      { id: nanoid(), value: "Innovation" },
      { id: nanoid(), value: "Responsibility" }
    ],
    designStyle: "modern",
    colorPreferences: ["#10B981", "#0F766E", "#38BDF8", "#1F2937"]
  });
  
  const [newValue, setNewValue] = useState("");

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
    setBrandInput(prev => ({ ...prev, designStyle: value }));
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

  const handleGenerateClick = () => {
    onGenerate();
    generateMutation.mutate(brandInput);
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
              <Select 
                value={brandInput.industry} 
                onValueChange={(value) => handleSelectChange("industry", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sustainable Technology">Sustainable Technology</SelectItem>
                  <SelectItem value="E-commerce">E-commerce</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                </SelectContent>
              </Select>
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
              <Label className="block text-sm font-medium text-gray-700">Color Preferences</Label>
              <div className="mt-2 flex items-center space-x-2">
                <span className="h-6 w-6 rounded-full bg-emerald-500 cursor-pointer ring-2 ring-offset-2 ring-emerald-500"></span>
                <span className="h-6 w-6 rounded-full bg-sky-600 cursor-pointer"></span>
                <span className="h-6 w-6 rounded-full bg-indigo-500 cursor-pointer"></span>
                <Button 
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 text-gray-400 hover:text-gray-500 hover:border-gray-400 p-0"
                >
                  <span className="sr-only">Add color</span>
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </Button>
              </div>
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
