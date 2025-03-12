import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ShareIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react";

const PresentationControls = () => {
  const [sideComparison, setSideComparison] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(0);

  return (
    <Card className="shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Presentation Controls</h2>
          <Button>
            <ExternalLinkIcon className="mr-2 h-5 w-5" />
            Enter Presentation Mode
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Before/After Toggle */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Side-by-Side Comparison</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Enable before/after view</span>
              <Switch 
                checked={sideComparison} 
                onCheckedChange={setSideComparison}
              />
            </div>
          </div>
          
          {/* Auto-advance Timer */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Auto-advance Slides</h3>
            <div className="flex items-center">
              <div className="flex-1">
                <Slider
                  value={[autoAdvance]}
                  onValueChange={(value) => setAutoAdvance(value[0])}
                  max={10}
                  step={1}
                />
              </div>
              <span className="ml-3 text-sm text-gray-700">
                {autoAdvance === 0 ? "Off" : `${autoAdvance}s`}
              </span>
            </div>
          </div>
          
          {/* Sharing Options */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Sharing Options</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <ShareIcon className="mr-1.5 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <DownloadIcon className="mr-1.5 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PresentationControls;
