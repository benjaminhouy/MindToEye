import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import LogoExploration from "./LogoExploration";
import BrandElementsOverview from "./BrandElementsOverview";
import { BrandConcept } from "@shared/schema";
import { MaximizeIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import LoadingOverlay from "./LoadingOverlay";

interface VisualizationPanelProps {
  concept?: BrandConcept;
  projectId?: number;
}

const VisualizationPanel = ({ concept: initialConcept, projectId }: VisualizationPanelProps) => {
  const [expanded, setExpanded] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [concept, setConcept] = useState(initialConcept);
  const { toast } = useToast();
  
  // Keep the local concept state in sync with the prop
  useEffect(() => {
    setConcept(initialConcept);
  }, [initialConcept]);

  // Track pending changes that need regeneration
  const [pendingChanges, setPendingChanges] = useState<{
    colors?: any;
    typography?: any;
    hasChanges: boolean;
    elementsToRegenerate: {
      logo?: boolean;
      typography?: boolean;
      colors?: boolean;
    };
  }>({ 
    hasChanges: false,
    elementsToRegenerate: {}
  });

  // Mutation to update a brand concept
  const updateConceptMutation = useMutation({
    mutationFn: async (data: { conceptId: number; updates: any }) => {
      const response = await apiRequest(
        "PATCH", 
        `/api/concepts/${data.conceptId}/update`, 
        data.updates
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/concepts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/concepts/${concept?.id}`] });
      toast({
        title: "Concept updated",
        description: "The brand concept has been updated successfully."
      });
    },
    onError: (error) => {
      console.error("Error updating concept:", error);
      toast({
        title: "Update failed",
        description: "Failed to update the brand concept. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for regenerating a concept with modified elements
  const regenerateElementMutation = useMutation({
    mutationFn: async (data: { 
      conceptId: number; 
      elementType: string;
      newValues: any;
      brandInputs: any;
      projectId: number;
    }) => {
      setIsRegenerating(true);
      setProgress(10); // Start progress

      const response = await apiRequest(
        "POST", 
        `/api/regenerate-element`, 
        data
      );
      
      // Show incremental progress
      setTimeout(() => setProgress(30), 500);
      setTimeout(() => setProgress(50), 1200);
      setTimeout(() => setProgress(70), 2000);
      
      const result = await response.json();
      setProgress(100); // Complete progress
      return result;
    },
    onSuccess: (data) => {
      // Immediately update the UI with the new data without waiting for refetch
      if (concept && data.brandOutput) {
        // Make a deep copy of the concept to avoid mutation issues
        const updatedConcept = {
          ...concept,
          brandOutput: data.brandOutput
        };
        
        // Force a re-render by setting a new object reference
        // This is a workaround for React Query's refetch delay
        setConcept(updatedConcept);
      }
      
      // Still invalidate queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/concepts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/concepts/${concept?.id}`] });
      
      setTimeout(() => {
        setIsRegenerating(false);
        setProgress(0);
        
        toast({
          title: "Element regenerated",
          description: "The brand element has been successfully regenerated."
        });
      }, 500); // Small delay to ensure progress bar completes
    },
    onError: (error) => {
      setIsRegenerating(false);
      setProgress(0);
      
      console.error("Error regenerating element:", error);
      toast({
        title: "Regeneration failed",
        description: "Failed to regenerate the brand element. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handler for editing brand elements
  const handleElementEdit = async (type: string, updatedData: any) => {
    if (!concept || !projectId) {
      toast({
        title: "Cannot update",
        description: "No active concept or project found.",
        variant: "destructive"
      });
      return;
    }

    // Special case for logo which should regenerate immediately
    if (type === 'logo') {
      try {
        await regenerateElementMutation.mutateAsync({
          conceptId: concept.id,
          elementType: type,
          newValues: updatedData,
          brandInputs: concept.brandInputs,
          projectId: projectId
        });
      } catch (error) {
        console.error("Error regenerating logo:", error);
      }
      return;
    }

    // For colors and typography, just save the changes locally
    // and mark as pending
    if (type === 'colors' || type === 'typography') {
      // Update the brandOutput directly for immediate visual feedback
      const brandOutputCopy = { ...concept.brandOutput as any };
      brandOutputCopy[type] = updatedData;
      
      // Determine which elements need regeneration based on what changed
      const elementsToRegenerate = {
        // Colors affect logo but not typography
        ...(type === 'colors' ? { logo: true, colors: true } : {}),
        // Typography changes only affect typography
        ...(type === 'typography' ? { typography: true } : {})
      };
      
      // Update the local state to track pending changes
      setPendingChanges(prev => ({
        ...prev,
        [type]: updatedData,
        hasChanges: true,
        elementsToRegenerate: {
          ...prev.elementsToRegenerate,
          ...elementsToRegenerate
        }
      }));
      
      // Show a toast notification informing the user to click "Apply Changes"
      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} updated instantly`,
        description: "Click 'Apply Changes' to regenerate visualizations. Changes ready for client preview.",
      });
      
      return;
    }
  };
  
  // Handle the "Apply Changes" action
  const handleRegenerateAll = async () => {
    if (!concept || !projectId || !pendingChanges.hasChanges) {
      if (!pendingChanges.hasChanges) {
        toast({
          title: "No changes to apply",
          description: "Make changes to colors or typography first before regenerating.",
        });
        return;
      }
      
      toast({
        title: "Cannot regenerate",
        description: "No active concept or project found.",
        variant: "destructive"
      });
      return;
    }
    
    // Apply pending changes in sequence, but only regenerate affected elements
    setIsRegenerating(true);
    setProgress(10);
    
    try {
      // Apply typography changes if needed
      if (pendingChanges.elementsToRegenerate.typography && pendingChanges.typography) {
        await regenerateElementMutation.mutateAsync({
          conceptId: concept.id,
          elementType: 'typography',
          newValues: pendingChanges.typography,
          brandInputs: concept.brandInputs,
          projectId: projectId
        });
      }
      
      // Apply color changes if needed
      if (pendingChanges.elementsToRegenerate.colors && pendingChanges.colors) {
        await regenerateElementMutation.mutateAsync({
          conceptId: concept.id,
          elementType: 'colors',
          newValues: pendingChanges.colors,
          brandInputs: concept.brandInputs,
          projectId: projectId
        });
      }
      
      // Regenerate logo if colors were changed
      if (pendingChanges.elementsToRegenerate.logo) {
        await regenerateElementMutation.mutateAsync({
          conceptId: concept.id,
          elementType: 'logo',
          newValues: null, // Logo doesn't need specific values as it's generated based on the brand concept
          brandInputs: concept.brandInputs,
          projectId: projectId
        });
      }
      
      // Reset pending changes
      setPendingChanges({ 
        hasChanges: false,
        elementsToRegenerate: {}
      });
      
      toast({
        title: "Changes applied successfully",
        description: "Brand visualizations updated and ready for client presentation. Review time saved!",
      });
    } catch (error) {
      console.error("Error applying all changes:", error);
      toast({
        title: "Regeneration failed",
        description: "Failed to apply all changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRegenerating(false);
      setProgress(0);
    }
  };

  if (!concept) {
    return (
      <Card className="shadow">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <svg 
            className="w-16 h-16 text-gray-400 mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="1.5" 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Brand Concept Generated Yet</h3>
          <p className="text-gray-500 text-center max-w-md">
            Fill in the brand inputs on the left and click "Generate Concepts" to create your first brand concept visualization.
          </p>
        </CardContent>
      </Card>
    );
  }

  const brandOutput = concept.brandOutput as any;
  const createdDate = new Date(concept.createdAt);

  return (
    <>
      {isRegenerating && <LoadingOverlay progress={progress} />}
      
      {/* Concept Overview */}
      <Card className="shadow overflow-hidden">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Brand Concept Overview</h2>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                Version {concept.id}
              </Badge>
              <span className="ml-2 text-sm text-gray-500">
                Created {format(createdDate, "MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex space-x-2">
              <div className="flex flex-col items-end">
                <Button 
                  variant={pendingChanges.hasChanges ? "default" : "outline"}
                  size="sm"
                  onClick={handleRegenerateAll}
                  className={pendingChanges.hasChanges ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  <RefreshCwIcon className="mr-1 h-4 w-4" />
                  {pendingChanges.hasChanges ? "Apply Changes" : "Regenerate All"}
                </Button>
                {pendingChanges.hasChanges && (
                  <span className="text-xs text-green-700 mt-1">Fast visualization updates ready</span>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                <MaximizeIcon className="mr-1 h-4 w-4" />
                {expanded ? "Collapse View" : "Expand View"}
              </Button>
            </div>
          </div>
        </CardContent>
        
        <BrandElementsOverview 
          brandOutput={brandOutput} 
          onElementEdit={handleElementEdit}
        />
      </Card>
      
      <LogoExploration brandOutput={brandOutput} />
      
      {/* Landing Page Hero Preview - Enhanced with Claude 3.5 */}
      <Card className="shadow overflow-hidden mt-6 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Landing Page Hero</h2>
          <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-1">AI-generated with Claude 3.5</span>
        </div>
        
        <div 
          className="rounded-lg p-8 flex flex-col items-center justify-center text-center relative overflow-hidden" 
          style={{
            background: brandOutput?.landingPageHero?.backgroundStyle || 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
          }}
        >
          {/* Optional decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <svg className="h-full w-full" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill={brandOutput?.colors?.find((c: any) => c.type === 'accent')?.hex || '#38BDF8'} 
                d="M37.5,-48.7C47.5,-35.7,53.8,-22.3,56.8,-7.8C59.8,6.7,59.5,22.2,51.4,31.1C43.4,40.1,27.5,42.4,12.1,47C-3.2,51.6,-18,58.3,-32.2,56.2C-46.3,54.1,-59.8,43.2,-65.9,28.6C-71.9,14,-70.5,-4.4,-64.9,-21.1C-59.2,-37.8,-49.3,-52.7,-36.2,-64.6C-23.1,-76.4,-6.8,-85.2,6.1,-92.7C18.9,-100.1,27.6,-61.7,37.5,-48.7Z" transform="translate(100 100)" />
            </svg>
          </div>
          
          {/* Main content */}
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700" 
                style={{
                  fontFamily: brandOutput?.typography?.headings || 'Montserrat',
                }}>
              {brandOutput?.landingPageHero?.heading || 'Brand Name - Industry'}
            </h1>
            
            <p className="mt-4 max-w-xl text-gray-700 text-lg"
              style={{
                fontFamily: brandOutput?.typography?.body || 'Open Sans'
              }}>
              {brandOutput?.landingPageHero?.subheading || 'Your brand description will appear here.'}
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 rounded-md text-white font-semibold transition-all hover:scale-105"
                      style={{
                        backgroundColor: brandOutput?.colors?.find((c: any) => c.type === 'primary')?.hex || '#10B981',
                        fontFamily: brandOutput?.typography?.body || 'Open Sans'
                      }}>
                {brandOutput?.landingPageHero?.ctaText || 'Learn More'}
              </button>
              
              <button className="px-8 py-3 rounded-md font-semibold transition-all hover:scale-105 border-2"
                      style={{
                        borderColor: brandOutput?.colors?.find((c: any) => c.type === 'primary')?.hex || '#10B981',
                        color: brandOutput?.colors?.find((c: any) => c.type === 'primary')?.hex || '#10B981',
                        fontFamily: brandOutput?.typography?.body || 'Open Sans',
                        background: 'rgba(255, 255, 255, 0.8)'
                      }}>
                Contact Us
              </button>
            </div>
          </div>
          
          {/* If there's an image description, show an icon and the description */}
          {brandOutput?.landingPageHero?.imageDescription && (
            <div className="mt-6 bg-white bg-opacity-80 p-3 rounded-md text-sm max-w-md">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span className="font-medium">Suggested visual element</span>
              </div>
              <p className="text-gray-700">{brandOutput?.landingPageHero?.imageDescription}</p>
            </div>
          )}
        </div>
      </Card>
    </>
  );
};

export default VisualizationPanel;
