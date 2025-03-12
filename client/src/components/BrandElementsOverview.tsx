import React from "react";

interface BrandElementsOverviewProps {
  brandOutput: any;
}

const BrandElementsOverview = ({ brandOutput }: BrandElementsOverviewProps) => {
  const colors = brandOutput?.colors || [
    { name: "Primary", hex: "#10B981", type: "primary" },
    { name: "Secondary", hex: "#0F766E", type: "secondary" },
    { name: "Accent", hex: "#38BDF8", type: "accent" },
    { name: "Base", hex: "#1F2937", type: "base" }
  ];

  const typography = brandOutput?.typography || {
    headings: "Montserrat",
    body: "Open Sans"
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 bg-gray-50 border-t border-b border-gray-200">
      {/* Logo */}
      <div className="p-8 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col items-center justify-center">
        <div className="w-32 h-32 flex items-center justify-center bg-white rounded-xl shadow-sm mb-4">
          {brandOutput?.logo?.primary ? (
            <div 
              dangerouslySetInnerHTML={{ __html: brandOutput.logo.primary }}
              className="w-full h-full flex items-center justify-center" 
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
          ) : (
            <svg className="w-24 h-24" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="90" stroke="#10B981" strokeWidth="8" fill="white"/>
              <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM135 110H110V135C110 140.52 105.52 145 100 145C94.48 145 90 140.52 90 135V110H65C59.48 110 55 105.52 55 100C55 94.48 59.48 90 65 90H90V65C90 59.48 94.48 55 100 55C105.52 55 110 59.48 110 65V90H135C140.52 90 145 94.48 145 100C145 105.52 140.52 110 135 110Z" fill="#10B981"/>
            </svg>
          )}
        </div>
        <h3 className="text-base font-medium text-gray-900">Logo</h3>
        <p className="mt-1 text-sm text-gray-500">{brandOutput?.logoDescription || 'Brand logo design'}</p>
      </div>
      
      {/* Color Palette */}
      <div className="p-8 border-b md:border-b-0 md:border-r border-gray-200">
        <h3 className="text-base font-medium text-gray-900 mb-3">Color Palette</h3>
        <div className="grid grid-cols-2 gap-2">
          {colors.map((color: any, index: number) => (
            <div key={index} className="rounded-lg overflow-hidden shadow-sm">
              <div className="h-12" style={{ backgroundColor: color.hex }}></div>
              <div className="bg-white p-2">
                <p className="text-xs font-medium text-gray-900">{color.name}</p>
                <p className="text-xs text-gray-500">{color.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Typography */}
      <div className="p-8">
        <h3 className="text-base font-medium text-gray-900 mb-3">Typography</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500 mb-1">Headings</p>
            <p className="text-xl font-bold" style={{ fontFamily: `'${typography.headings}', sans-serif` }}>
              {typography.headings}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Body Text</p>
            <p className="text-base" style={{ fontFamily: `'${typography.body}', sans-serif` }}>
              {typography.body}
            </p>
          </div>
          <div className="pt-2">
            <p className="text-sm font-medium">The quick brown fox jumps over the lazy dog.</p>
            <p className="text-sm">Portez ce vieux whisky au juge blond qui fume.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandElementsOverview;
