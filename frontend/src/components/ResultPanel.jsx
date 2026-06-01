import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ResultPanel({ resultUrl, isLoading, errorMessage, inferenceTime }) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Toggle body overflow scroll when lightbox is active
  useEffect(() => {
    document.body.style.overflow = isLightboxOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen]);

  return (
    <Card className="w-full flex flex-col justify-between">
      <CardHeader>
        <CardTitle>Result</CardTitle>
        <CardDescription>Generated stylized output</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4 h-64 border border-zinc-800 rounded-lg bg-zinc-950">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-zinc-800 border-t-zinc-400 animate-spin"></div>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <span className="text-sm font-medium text-zinc-400 animate-pulse">Stylizing images...</span>
              <span className="text-xs text-zinc-600 font-light">This may take a few seconds on CPU</span>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center justify-center border-2 border-red-950 bg-red-950/20 text-red-200 rounded-lg p-6 text-center h-64">
            <svg className="w-10 h-10 mb-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span className="text-sm font-semibold mb-1">Stylization Failed</span>
            <span className="text-xs text-red-400 max-w-xs break-words">
              {errorMessage}
            </span>
          </div>
        ) : resultUrl ? (
          <div className="flex flex-col space-y-4">
            <div 
              className="relative w-full h-64 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950 flex items-center justify-center cursor-zoom-in group"
              onClick={() => setIsLightboxOpen(true)}
            >
              <img 
                src={resultUrl} 
                alt="Stylized Output" 
                className="max-w-full max-h-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              />
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-[10px] text-zinc-400 px-2 py-0.5 rounded pointer-events-none select-none opacity-0 group-hover:opacity-100 transition-opacity">
                Click to expand
              </div>
            </div>
            
            <div className="w-full flex flex-col space-y-3">
              {inferenceTime && (
                <p className="text-xs text-zinc-500 text-center font-light">
                  Generated in {inferenceTime}s
                </p>
              )}

              <a 
                href={resultUrl} 
                download="stylized_output.png"
                className="w-full block"
              >
                <Button 
                  className="w-full text-zinc-950 bg-zinc-50 hover:bg-zinc-200 font-semibold rounded-md shadow-md transition"
                >
                  <svg className="w-4 h-4 mr-2 inline-block align-middle" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Download PNG
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-lg p-12 text-center h-64 bg-zinc-950">
            <svg className="w-10 h-10 mb-3 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span className="text-sm text-zinc-500 font-light">
              Your stylized image will appear here
            </span>
          </div>
        )}

        {/* Lightbox Overlay */}
        {isLightboxOpen && resultUrl && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out select-none animate-in fade-in duration-200"
            onClick={() => setIsLightboxOpen(false)}
          >
            <img 
              src={resultUrl} 
              alt="Stylized Output Expanded View" 
              className="max-w-full max-h-full object-contain rounded shadow-2xl"
            />
            <div className="absolute top-4 right-4 bg-zinc-900/85 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer transition">
              ✕
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
