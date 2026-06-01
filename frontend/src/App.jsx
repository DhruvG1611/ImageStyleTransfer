import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import ImageUploadPanel from './components/ImageUploadPanel'
import ResultPanel from './components/ResultPanel'
import StatusBadge from './components/StatusBadge'
import AlphaSlider from './components/AlphaSlider'
import { stylizeImages } from './lib/api'

export default function App() {
  const [contentFile, setContentFile] = useState(null)
  const [contentPreview, setContentPreview] = useState(null)
  const [styleFile, setStyleFile] = useState(null)
  const [stylePreview, setStylePreview] = useState(null)
  const [alpha, setAlpha] = useState(1.0)
  const [resultUrl, setResultUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState("idle")
  const [errorMessage, setErrorMessage] = useState(null)
  const [inferenceTime, setInferenceTime] = useState(null)

  // Cleanup object URLs when previews change or on unmount
  useEffect(() => {
    return () => {
      if (contentPreview) {
        URL.revokeObjectURL(contentPreview)
      }
    }
  }, [contentPreview])

  useEffect(() => {
    return () => {
      if (stylePreview) {
        URL.revokeObjectURL(stylePreview)
      }
    }
  }, [stylePreview])

  useEffect(() => {
    return () => {
      if (resultUrl && resultUrl.startsWith('blob:')) {
        URL.revokeObjectURL(resultUrl)
      }
    }
  }, [resultUrl])

  const handleContentSelect = (file, previewUrl) => {
    setContentFile(file)
    setContentPreview(previewUrl)
    setResultUrl(null)
    setErrorMessage(null)
    setStatus("idle")
  }

  const handleStyleSelect = (file, previewUrl) => {
    setStyleFile(file)
    setStylePreview(previewUrl)
    setResultUrl(null)
    setErrorMessage(null)
    setStatus("idle")
  }

  const handleStylize = async () => {
    if (!contentFile || !styleFile || isLoading) return
    
    setIsLoading(true)
    setStatus("loading")
    setErrorMessage(null)
    setInferenceTime(null)
    
    // Revoke previous result URL if exists
    if (resultUrl && resultUrl.startsWith('blob:')) {
      URL.revokeObjectURL(resultUrl)
    }
    setResultUrl(null)

    const startTime = Date.now()

    try {
      const blob = await stylizeImages(contentFile, styleFile, alpha)
      if (blob) {
        const url = URL.createObjectURL(blob)
        setResultUrl(url)
        setStatus("success")
        
        // Calculate inference duration in seconds formatted to 1 decimal place
        const durationSecs = ((Date.now() - startTime) / 1000).toFixed(1)
        setInferenceTime(durationSecs)
      } else {
        throw new Error("No image data returned from stylize helper")
      }
    } catch (error) {
      setErrorMessage(error.message || "An unexpected error occurred during stylization")
      setStatus("error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    // Revoke all active object URLs to prevent leaks
    if (contentPreview) {
      URL.revokeObjectURL(contentPreview)
    }
    if (stylePreview) {
      URL.revokeObjectURL(stylePreview)
    }
    if (resultUrl && resultUrl.startsWith('blob:')) {
      URL.revokeObjectURL(resultUrl)
    }

    setContentFile(null)
    setContentPreview(null)
    setStyleFile(null)
    setStylePreview(null)
    setResultUrl(null)
    setErrorMessage(null)
    setInferenceTime(null)
    setStatus("idle")
    setAlpha(1.0)
    setIsLoading(false)
  }

  const isButtonEnabled = contentFile && styleFile && !isLoading
  const isResetDisabled = !contentFile && !styleFile && !resultUrl && !errorMessage

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col font-sans selection:bg-zinc-800">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent tracking-tight">
              StyleTransfer
            </span>
            <span className="text-xs text-zinc-500 font-medium bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
              v1.0.0
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-zinc-400 font-light hidden sm:block">
              AI-powered image style transfer
            </span>
            <StatusBadge status={status} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col justify-between">
        <div className="space-y-8 flex-1 flex flex-col justify-center">
          {/* Header titles */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl bg-gradient-to-b from-zinc-50 to-zinc-400 bg-clip-text text-transparent">
              Create Stunning AI Art Locally
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto font-light">
              Select a content photo and a style painting, then blend them instantly using Adaptive Instance Normalization.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <ImageUploadPanel 
              title="Content Image" 
              description="Upload your content photo to apply the style to"
              file={contentFile}
              previewUrl={contentPreview}
              onImageSelect={handleContentSelect}
              isLoading={isLoading}
            />
            <ImageUploadPanel 
              title="Style Image" 
              description="Upload your target style painting or texture"
              file={styleFile}
              previewUrl={stylePreview}
              onImageSelect={handleStyleSelect}
              isLoading={isLoading}
            />
            <ResultPanel 
              resultUrl={resultUrl}
              isLoading={isLoading}
              errorMessage={errorMessage}
              inferenceTime={inferenceTime}
            />
          </div>

          {/* Slider and Stylize Section */}
          <div className="flex flex-col items-center justify-center space-y-6 pt-4">
            {/* Center Slider with width max 400px */}
            <div className="w-full max-w-[400px] px-4">
              <AlphaSlider 
                value={alpha} 
                onChange={setAlpha}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col items-center space-y-3 w-full max-w-[400px] sm:max-w-none px-4">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center justify-center">
                <Button 
                  size="lg" 
                  onClick={handleStylize}
                  disabled={!isButtonEnabled} 
                  className={`px-8 py-6 text-base font-semibold rounded-full shadow-lg transition duration-200 ease-in-out cursor-pointer flex-1 sm:flex-none
                    ${isButtonEnabled 
                      ? 'bg-zinc-50 hover:bg-zinc-200 text-zinc-950' 
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                    }`}
                >
                  {isLoading ? (
                    <svg className="w-5 h-5 mr-2 animate-spin text-zinc-650" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className={`w-5 h-5 mr-2 text-current ${isButtonEnabled ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  )}
                  {isLoading ? 'Processing...' : 'Stylize'}
                </Button>

                <Button 
                  size="lg"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isResetDisabled}
                  className={`px-8 py-6 text-base font-semibold rounded-full border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/50 hover:text-white cursor-pointer transition flex-1 sm:flex-none
                    ${isResetDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-5 h-5 mr-2 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5"></path>
                  </svg>
                  Reset
                </Button>
              </div>
              
              {errorMessage && (
                <p className="text-sm font-semibold text-red-500 max-w-sm text-center animate-bounce">
                  Error: {errorMessage}
                </p>
              )}

              <p className="text-xs text-zinc-500 font-light">
                {isLoading 
                  ? "Blending images. This takes ~3-4 seconds..." 
                  : isButtonEnabled 
                    ? "Ready to run local style transfer." 
                    : "Upload both content and style images to begin."}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 bg-zinc-950 text-center">
        <div className="max-w-7xl mx-auto px-4 text-xs text-zinc-600 dark:text-zinc-500 font-light space-y-1">
          <p>Images are processed entirely in memory on your local machine and never saved to disk.</p>
          <p>© 2026 StyleTransfer. Local Model Pipeline.</p>
        </div>
      </footer>
    </div>
  )
}
