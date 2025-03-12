import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import LogoExploration from "./LogoExploration";
import BrandElementsOverview from "./BrandElementsOverview";
import MockupExamples from "./MockupExamples";
import PresentationControls from "./PresentationControls";
import { BrandConcept } from "@shared/schema";
import { CalendarIcon, MoreHorizontalIcon, MaximizeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface VisualizationPanelProps {
  concept?: BrandConcept;
}

const VisualizationPanel = ({ concept }: VisualizationPanelProps) => {
  const [expanded, setExpanded] = useState(false);

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
              <Button variant="outline" size="sm">
                <MoreHorizontalIcon className="mr-1 h-4 w-4" />
                Options
              </Button>
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
        
        <BrandElementsOverview brandOutput={brandOutput} />
        
        <MockupExamples brandOutput={brandOutput} />
      </Card>
      
      <LogoExploration brandOutput={brandOutput} />
      
      <PresentationControls />
    </>
  );
};

export default VisualizationPanel;
