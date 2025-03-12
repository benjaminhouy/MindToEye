import { Progress } from "@/components/ui/progress";
import { Loader2Icon } from "lucide-react";

interface LoadingOverlayProps {
  progress: number;
}

const LoadingOverlay = ({ progress }: LoadingOverlayProps) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <div className="flex items-center justify-center mb-4">
          <Loader2Icon className="animate-spin h-10 w-10 text-primary" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 text-center">Generating Brand Concepts</h3>
        <div className="mt-3">
          <div className="relative pt-1">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Analyzing brand inputs</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500 text-center">This might take a moment as our AI generates your brand assets</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
