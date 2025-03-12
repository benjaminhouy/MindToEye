import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DownloadIcon, MaximizeIcon } from "lucide-react";

interface LogoExplorationProps {
  brandOutput: any;
}

const LogoExploration = ({ brandOutput }: LogoExplorationProps) => {
  // Default logo variants if not provided in brandOutput
  const logoVariants = brandOutput?.logoVariants || {
    primary: (
      <svg className="w-20 h-20" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="90" stroke="#10B981" strokeWidth="8" fill="white"/>
        <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM135 110H110V135C110 140.52 105.52 145 100 145C94.48 145 90 140.52 90 135V110H65C59.48 110 55 105.52 55 100C55 94.48 59.48 90 65 90H90V65C90 59.48 94.48 55 100 55C105.52 55 110 59.48 110 65V90H135C140.52 90 145 94.48 145 100C145 105.52 140.52 110 135 110Z" fill="#10B981"/>
      </svg>
    ),
    monochrome: (
      <svg className="w-20 h-20" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="90" stroke="#1F2937" strokeWidth="8" fill="white"/>
        <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM135 110H110V135C110 140.52 105.52 145 100 145C94.48 145 90 140.52 90 135V110H65C59.48 110 55 105.52 55 100C55 94.48 59.48 90 65 90H90V65C90 59.48 94.48 55 100 55C105.52 55 110 59.48 110 65V90H135C140.52 90 145 94.48 145 100C145 105.52 140.52 110 135 110Z" fill="#1F2937"/>
      </svg>
    ),
    reverse: (
      <svg className="w-20 h-20" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="8" fill="none"/>
        <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM135 110H110V135C110 140.52 105.52 145 100 145C94.48 145 90 140.52 90 135V110H65C59.48 110 55 105.52 55 100C55 94.48 59.48 90 65 90H90V65C90 59.48 94.48 55 100 55C105.52 55 110 59.48 110 65V90H135C140.52 90 145 94.48 145 100C145 105.52 140.52 110 135 110Z" fill="white"/>
      </svg>
    )
  };

  return (
    <Card className="shadow overflow-hidden">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Logo Exploration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Logo Variant 1 */}
          <div className="border border-primary-100 rounded-lg p-4 bg-white shadow-sm">
            <div className="h-24 flex items-center justify-center bg-white mb-3">
              {brandOutput?.logo?.primary ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: brandOutput.logo.primary }}
                  className="w-20 h-20 mx-auto"
                />
              ) : (
                logoVariants.primary
              )}
            </div>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Primary Logo</h3>
                <p className="text-xs text-gray-500">Full color version</p>
              </div>
              <div className="flex justify-center space-x-2">
                <button type="button" className="text-gray-400 hover:text-gray-500">
                  <DownloadIcon className="h-5 w-5" />
                </button>
                <button type="button" className="text-gray-400 hover:text-gray-500">
                  <MaximizeIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Logo Variant 2 */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
            <div className="h-24 flex items-center justify-center bg-white mb-3">
              {brandOutput?.logo?.monochrome ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: brandOutput.logo.monochrome }}
                  className="w-20 h-20 mx-auto"
                />
              ) : (
                logoVariants.monochrome
              )}
            </div>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Monochrome Version</h3>
                <p className="text-xs text-gray-500">One-color application</p>
              </div>
              <div className="flex justify-center space-x-2">
                <button type="button" className="text-gray-400 hover:text-gray-500">
                  <DownloadIcon className="h-5 w-5" />
                </button>
                <button type="button" className="text-gray-400 hover:text-gray-500">
                  <MaximizeIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Logo Variant 3 */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
            <div className="h-24 flex items-center justify-center bg-emerald-500 mb-3 rounded">
              {brandOutput?.logo?.reverse ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: brandOutput.logo.reverse }}
                  className="w-20 h-20 mx-auto"
                />
              ) : (
                logoVariants.reverse
              )}
            </div>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Reverse Version</h3>
                <p className="text-xs text-gray-500">For dark backgrounds</p>
              </div>
              <div className="flex justify-center space-x-2">
                <button type="button" className="text-gray-400 hover:text-gray-500">
                  <DownloadIcon className="h-5 w-5" />
                </button>
                <button type="button" className="text-gray-400 hover:text-gray-500">
                  <MaximizeIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LogoExploration;
