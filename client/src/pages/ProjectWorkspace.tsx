import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, QueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DownloadIcon, PresentationIcon, CalendarIcon, InfoIcon } from "lucide-react";
import { Project, BrandConcept } from "@shared/schema";
import { format } from "date-fns";
import BrandInputPanel from "@/components/BrandInputPanel";
import VisualizationPanel from "@/components/VisualizationPanel";
import LoadingOverlay from "@/components/LoadingOverlay";
import { supabase } from "@/lib/supabase";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ProjectWorkspaceProps {
  id?: string;
}

const ProjectWorkspace = ({ id }: ProjectWorkspaceProps) => {
  const [match, params] = useRoute<{ id: string }>("/projects/:id");
  
  // Use the prop id if provided, otherwise use the route param
  const projectId = id || params?.id;
  const [activeTab, setActiveTab] = useState("brand-concept");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeConceptId, setActiveConceptId] = useState<number | null>(null);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { data: concepts, isLoading: conceptsLoading } = useQuery<BrandConcept[]>({
    queryKey: [`/api/projects/${projectId}/concepts`],
    enabled: !!projectId,
  });

  const activeConcept = concepts?.find(concept => concept.id === activeConceptId) || 
                         concepts?.find(concept => concept.isActive) ||
                         concepts?.[0];

  const handleGenerate = () => {
    setIsGenerating(true);
    setProgress(0); // Reset progress
  };
  
  // Function to update progress from child components
  const updateProgress = (value: number) => {
    setProgress(value);
    // When progress reaches 100%, hide loading overlay after a short delay
    if (value >= 100) {
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
      }, 500);
    }
  };

  if (!match) return null;
  
  if (projectLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="border-b border-gray-200 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 bg-gray-100 h-64 rounded-lg"></div>
            <div className="lg:col-span-9 bg-gray-100 h-96 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Project Header */}
        <div className="mb-6 md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              {project?.name || "Brand Identity Project"}
            </h1>
            <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <CalendarIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                Created on {project?.createdAt ? format(new Date(project.createdAt), "MMMM d, yyyy") : "..."}
              </div>
              {project?.clientName && (
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <InfoIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  Client: {project.clientName}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <Button variant="outline">
              <DownloadIcon className="mr-2 h-5 w-5" />
              Export
            </Button>
            <Button>
              <PresentationIcon className="mr-2 h-5 w-5" />
              Present to Client
            </Button>
          </div>
        </div>

        {/* Project Workspace Tabs */}
        <Tabs defaultValue="brand-concept" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 mb-6">
            <TabsTrigger 
              value="brand-concept" 
              className="data-[state=active]:border-primary data-[state=active]:text-primary-600 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent py-4 px-1 data-[state=active]:border-b-2"
            >
              Brand Concept
            </TabsTrigger>
            <TabsTrigger 
              value="logo-explorations" 
              className="data-[state=active]:border-primary data-[state=active]:text-primary-600 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent py-4 px-1 data-[state=active]:border-b-2"
            >
              Logo Explorations
            </TabsTrigger>
            <TabsTrigger 
              value="marketing-assets" 
              className="data-[state=active]:border-primary data-[state=active]:text-primary-600 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent py-4 px-1 data-[state=active]:border-b-2"
            >
              Marketing Assets
            </TabsTrigger>
            <TabsTrigger 
              value="website-mockups" 
              className="data-[state=active]:border-primary data-[state=active]:text-primary-600 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent py-4 px-1 data-[state=active]:border-b-2"
            >
              Website Mockups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brand-concept" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-3 space-y-5">
                <BrandInputPanel 
                  onGenerate={handleGenerate} 
                  savedConcepts={concepts || []}
                  activeConcept={activeConcept}
                  onConceptSelect={setActiveConceptId}
                  projectId={Number(projectId)}
                  projectName={project?.name}
                  onProgressUpdate={updateProgress}
                />
              </div>
              <div className="lg:col-span-9 space-y-6">
                <VisualizationPanel 
                  concept={activeConcept}
                  projectId={Number(projectId)}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="logo-explorations">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900">Logo Explorations Coming Soon</h3>
              <p className="mt-1 text-sm text-gray-500">This feature is currently in development.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="marketing-assets">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900">Marketing Assets Coming Soon</h3>
              <p className="mt-1 text-sm text-gray-500">This feature is currently in development.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="website-mockups">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900">Website Mockups Coming Soon</h3>
              <p className="mt-1 text-sm text-gray-500">This feature is currently in development.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {isGenerating && (
        <LoadingOverlay progress={progress} />
      )}
    </>
  );
};

export default ProjectWorkspace;
