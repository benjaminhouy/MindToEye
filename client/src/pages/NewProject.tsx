import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const NewProject = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  // Pass the Supabase Auth ID directly (our API will handle the mapping)
  const authId = user?.id;
  
  interface ProjectFormData {
    name: string;
    clientName: string;
  }
  
  const [projectData, setProjectData] = useState<ProjectFormData>({
    name: "",
    clientName: "",
  });

  const createProjectMutation = useMutation({
    mutationFn: async (formData: ProjectFormData) => {
      // Ensure data matches the server-side schema (key names must match exactly)
      const projectData = { 
        name: formData.name,
        clientName: formData.clientName
      };
      
      console.log("Sending project data:", JSON.stringify(projectData));
      
      // Use headers to pass auth information
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      // Add auth information if available
      if (authId) {
        // Set custom header for authId that our backend will look for
        headers["x-auth-id"] = authId;
        console.log("Including auth ID in request:", authId);
      }
      
      const response = await fetch("/api/projects", {
        method: "POST",
        headers,
        body: JSON.stringify(projectData)
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      // Navigate to the dashboard first for safety
      setLocation("/");
      
      // Show toast with action to navigate to project
      toast({
        title: "Project created",
        description: "Your new project has been created successfully.",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation(`/projects/${data.id}`)}
          >
            View Project
          </Button>
        )
      });
    },
    onError: () => {
      toast({
        title: "Project creation failed",
        description: "There was a problem creating your project. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProjectData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectData.name.trim()) {
      toast({
        title: "Missing project name",
        description: "Please enter a name for your project.",
        variant: "destructive",
      });
      return;
    }
    
    createProjectMutation.mutate(projectData);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/")}
          className="mb-4"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                name="name"
                value={projectData.name}
                onChange={handleInputChange}
                placeholder="Enter project name"
                required
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="clientName">Client Name (Optional)</Label>
              <Input
                id="clientName"
                name="clientName"
                value={projectData.clientName}
                onChange={handleInputChange}
                placeholder="Enter client name"
                className="mt-1"
              />
            </div>
            
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full"
                disabled={createProjectMutation.isPending}
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewProject;