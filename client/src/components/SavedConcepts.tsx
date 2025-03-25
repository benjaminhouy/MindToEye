import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { BrandConcept } from "@shared/schema";
import { CheckIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

interface SavedConceptsProps {
  concepts: BrandConcept[];
  activeConcept?: BrandConcept;
  onSelect: (id: number | null) => void;
}

const SavedConcepts = ({ concepts, activeConcept, onSelect }: SavedConceptsProps) => {
  const { toast } = useToast();
  const [authId, setAuthId] = useState<string | null>(null);

  // Get auth ID for API requests
  useEffect(() => {
    const getAuthUser = async () => {
      try {
        // First check if we're using direct DB authentication (numeric ID)
        // This is for converted users that are being handled by our custom login endpoint
        const storedAuthId = sessionStorage.getItem('user_id');
        if (storedAuthId) {
          console.log("SavedConcepts: Using stored numeric ID from sessionStorage:", storedAuthId);
          setAuthId(storedAuthId);
          return;
        }

        // Otherwise use Supabase auth
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          setAuthId(data.user.id);
          console.log("SavedConcepts: Auth ID retrieved for API requests:", data.user.id);
        } else {
          console.error("SavedConcepts: No user ID found in auth data");
        }
      } catch (error) {
        console.error("Error fetching auth user in SavedConcepts:", error);
      }
    };
    
    getAuthUser();
  }, []);

  const setActiveMutation = useMutation({
    mutationFn: async (conceptId: number) => {
      // Create auth headers
      const headers: Record<string, string> = {};
      if (authId) {
        headers['x-auth-id'] = authId;
        console.log("Including auth ID in set-active request:", authId);
      }
      
      const response = await apiRequest(
        "PATCH", 
        `/api/concepts/${conceptId}/set-active`, 
        {},
        headers // Pass auth headers to ensure server gets them
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/concepts`] });
      toast({
        title: "Concept activated",
        description: "This brand concept is now active.",
      });
    },
    onError: (error) => {
      console.error("Error activating concept:", error);
      toast({
        title: "Activation failed",
        description: "There was a problem activating this concept.",
        variant: "destructive",
      });
    }
  });

  const handleConceptClick = (concept: BrandConcept) => {
    onSelect(concept.id);
    if (!concept.isActive) {
      setActiveMutation.mutate(concept.id);
    }
  };

  if (concepts.length === 0) {
    return null;
  }

  return (
    <Card className="shadow">
      <CardContent className="pt-5">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Saved Concepts</h2>
        <div className="space-y-3">
          {concepts.map((concept) => {
            const isActive = activeConcept?.id === concept.id;
            return (
              <div 
                key={concept.id}
                className={`flex items-center p-2 rounded hover:bg-gray-50 cursor-pointer ${
                  isActive ? 'bg-gray-50 border border-primary-100' : ''
                }`}
                onClick={() => handleConceptClick(concept)}
              >
                <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded flex items-center justify-center">
                  <span className="text-primary-700 font-medium">
                    V{concepts.indexOf(concept) + 1}
                  </span>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{concept.name}</p>
                  <p className="text-xs text-gray-500">
                    Created {format(new Date(concept.createdAt), "PPp")}
                  </p>
                </div>
                {isActive && (
                  <div>
                    <CheckIcon className="h-5 w-5 text-primary" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SavedConcepts;
