import React, { useState, useRef } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MockupExamplesProps {
  brandOutput: any;
}

const MockupExamples = ({ brandOutput }: MockupExamplesProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Default mockups if not provided in brandOutput
  const mockups = brandOutput?.mockups || [
    { type: "Business Card", imageUrl: "" },
    { type: "Letterhead", imageUrl: "" },
    { type: "Email Signature", imageUrl: "" },
    { type: "Website", imageUrl: "" }
  ];

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
      setScrollPosition(Math.max(0, scrollPosition - 200));
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
      setScrollPosition(scrollPosition + 200);
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-base font-medium text-gray-900 mb-4">Brand Applications</h3>
      <div className="relative">
        <div 
          ref={scrollContainerRef}
          className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Business Card Mockup */}
          <div className="flex-shrink-0 w-60 rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="p-3 bg-white">
              <div className="bg-emerald-500 text-white rounded p-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <svg className="h-32 w-32 absolute -bottom-10 -right-10" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM135 110H110V135C110 140.52 105.52 145 100 145C94.48 145 90 140.52 90 135V110H65C59.48 110 55 105.52 55 100C55 94.48 59.48 90 65 90H90V65C90 59.48 94.48 55 100 55C105.52 55 110 59.48 110 65V90H135C140.52 90 145 94.48 145 100C145 105.52 140.52 110 135 110Z" fill="white"/>
                  </svg>
                </div>
                <div className="relative">
                  <h4 className="text-base font-bold">{brandOutput?.brandName || 'Brand Name'}</h4>
                  <p className="text-xs text-white/90 mt-1">{brandOutput?.tagline || brandOutput?.industry || 'Brand Tagline'}</p>
                </div>
              </div>
              <div className="pt-3 pb-1">
                <p className="text-sm font-medium text-gray-900">Sarah Johnson</p>
                <p className="text-xs text-gray-500">Chief Sustainability Officer</p>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-700">+1 (555) 123-4567</p>
                  <p className="text-xs text-gray-700">sarah@ecovision.com</p>
                  <p className="text-xs text-gray-700">www.ecovision.com</p>
                </div>
              </div>
            </div>
            <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-700">
              Business Card
            </div>
          </div>
          
          {/* Letterhead Mockup */}
          <div className="flex-shrink-0 w-60 rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="p-3 bg-white">
              <div className="border border-gray-200 rounded">
                <div className="p-3 border-b border-gray-200 flex items-center">
                  <svg className="w-8 h-8" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="100" cy="100" r="90" stroke="#10B981" strokeWidth="8" fill="white"/>
                    <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM135 110H110V135C110 140.52 105.52 145 100 145C94.48 145 90 140.52 90 135V110H65C59.48 110 55 105.52 55 100C55 94.48 59.48 90 65 90H90V65C90 59.48 94.48 55 100 55C105.52 55 110 59.48 110 65V90H135C140.52 90 145 94.48 145 100C145 105.52 140.52 110 135 110Z" fill="#10B981"/>
                  </svg>
                  <div className="ml-2">
                    <h4 className="text-sm font-bold text-gray-900">{brandOutput?.brandName || 'Brand Name'}</h4>
                    <p className="text-xs text-gray-500">{brandOutput?.tagline || brandOutput?.industry || 'Brand Tagline'}</p>
                  </div>
                </div>
                <div className="p-3">
                  <div className="h-3 bg-gray-200 rounded-full w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded-full w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded-full w-5/6 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded-full w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded-full w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded-full w-4/5"></div>
                </div>
                <div className="bg-emerald-50 p-2 text-xs text-emerald-800 border-t border-emerald-100">
                  123 Business Ave, Suite 101 | www.{brandOutput?.brandName?.toLowerCase().replace(/\s+/g, '') || 'brand'}.com | 555-123-4567
                </div>
              </div>
            </div>
            <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-700">
              Letterhead
            </div>
          </div>
          
          {/* Email Signature Mockup */}
          <div className="flex-shrink-0 w-60 rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="p-3 bg-white">
              <div className="border border-gray-200 rounded p-3">
                <div className="border-t border-gray-200 pt-2 mt-4">
                  <div className="flex items-center">
                    <svg className="w-8 h-8" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="100" cy="100" r="90" stroke="#10B981" strokeWidth="8" fill="white"/>
                      <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM135 110H110V135C110 140.52 105.52 145 100 145C94.48 145 90 140.52 90 135V110H65C59.48 110 55 105.52 55 100C55 94.48 59.48 90 65 90H90V65C90 59.48 94.48 55 100 55C105.52 55 110 59.48 110 65V90H135C140.52 90 145 94.48 145 100C145 105.52 140.52 110 135 110Z" fill="#10B981"/>
                    </svg>
                    <div className="ml-2">
                      <h4 className="text-sm font-bold text-gray-900">Sarah Johnson</h4>
                      <p className="text-xs text-gray-500">Chief Sustainability Officer</p>
                    </div>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-700">
                    <p>{brandOutput?.brandName || 'Brand Name'} Technologies</p>
                    <p>+1 (555) 123-4567</p>
                    <p>contact@{brandOutput?.brandName?.toLowerCase().replace(/\s+/g, '') || 'brand'}.com</p>
                    <div className="flex space-x-2 mt-2">
                      <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0014.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z"></path>
                      </svg>
                      <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                      </svg>
                      <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.335 18.339H15.67v-4.177c0-.996-.02-2.278-1.39-2.278-1.389 0-1.601 1.084-1.601 2.205v4.25h-2.666V9.75h2.56v1.17h.035c.358-.674 1.228-1.387 2.528-1.387 2.7 0 3.2 1.778 3.2 4.091v4.715zM7.003 8.575a1.546 1.546 0 01-1.548-1.549 1.548 1.548 0 111.547 1.549zm1.336 9.764H5.666V9.75H8.34v8.589zM19.67 3H4.329C3.593 3 3 3.58 3 4.297v15.406C3 20.42 3.594 21 4.328 21h15.338C20.4 21 21 20.42 21 19.703V4.297C21 3.58 20.4 3 19.666 3h.003z"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-700">
              Email Signature
            </div>
          </div>
          
          {/* Website Mockup */}
          <div className="flex-shrink-0 w-60 rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="p-3 bg-white">
              <div className="border border-gray-200 rounded overflow-hidden">
                <div className="h-4 bg-gray-100 border-b border-gray-200 flex items-center px-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  </div>
                </div>
                <div className="pt-2 px-2">
                  <div className="flex items-center justify-between mb-2">
                    <svg className="w-6 h-6" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="100" cy="100" r="90" stroke="#10B981" strokeWidth="8" fill="white"/>
                      <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM135 110H110V135C110 140.52 105.52 145 100 145C94.48 145 90 140.52 90 135V110H65C59.48 110 55 105.52 55 100C55 94.48 59.48 90 65 90H90V65C90 59.48 94.48 55 100 55C105.52 55 110 59.48 110 65V90H135C140.52 90 145 94.48 145 100C145 105.52 140.52 110 135 110Z" fill="#10B981"/>
                    </svg>
                    <div className="flex space-x-1">
                      <div className="h-2 w-6 bg-gray-200 rounded"></div>
                      <div className="h-2 w-6 bg-gray-200 rounded"></div>
                      <div className="h-2 w-6 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="h-16 rounded bg-emerald-500 flex items-center justify-center mb-2">
                    <div className="text-center text-white text-xs font-bold">
                      {brandOutput?.tagline || brandOutput?.industry || 'Brand Tagline'}
                    </div>
                  </div>
                  <div className="space-y-2 mb-2">
                    <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-2 bg-gray-200 rounded w-4/6"></div>
                    <div className="h-2 bg-gray-200 rounded w-3/6"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    <div className="h-8 bg-emerald-100 rounded"></div>
                    <div className="h-8 bg-emerald-100 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-700">
              Website
            </div>
          </div>
        </div>
        
        {/* Navigation arrows */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white rounded-full p-1 shadow-md hover:bg-gray-50"
          onClick={scrollLeft}
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-white rounded-full p-1 shadow-md hover:bg-gray-50"
          onClick={scrollRight}
        >
          <ArrowRightIcon className="h-5 w-5 text-gray-600" />
        </Button>
      </div>
    </div>
  );
};

export default MockupExamples;
