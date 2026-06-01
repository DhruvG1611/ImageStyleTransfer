import React, { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ImageUploadPanel({ 
  title, 
  description, 
  file, 
  previewUrl, 
  onImageSelect, 
  maxSizeMb = 5, 
  isLoading = false 
}) {
  const [errorMsg, setErrorMsg] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setErrorMsg(null);
      if (acceptedFiles && acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0];
        const selectedPreviewUrl = URL.createObjectURL(selectedFile);
        onImageSelect(selectedFile, selectedPreviewUrl);
      }
    },
    onDropRejected: (fileRejections) => {
      if (fileRejections && fileRejections.length > 0) {
        const firstError = fileRejections[0].errors[0];
        if (firstError.code === 'file-too-large') {
          setErrorMsg(`File exceeds ${maxSizeMb}MB limit`);
        } else if (firstError.code === 'file-invalid-type') {
          setErrorMsg('Only JPEG, PNG, and WEBP images are accepted');
        } else {
          setErrorMsg(firstError.message || 'File upload rejected');
        }
      }
    },
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxSize: maxSizeMb * 1024 * 1024,
    multiple: false,
    disabled: isLoading
  });

  const handleRemove = (e) => {
    e.stopPropagation();
    setErrorMsg(null);
    onImageSelect(null, null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  return (
    <Card className={`w-full flex flex-col justify-between transition-all duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed select-none' : ''}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        {previewUrl ? (
          <div className="relative group flex flex-col space-y-4">
            <div className="relative w-full h-64 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950 flex items-center justify-center">
              <img 
                src={previewUrl} 
                alt={`${title} Preview`} 
                className="max-w-full max-h-full object-contain"
              />
              
              {/* Checkmark Badge */}
              <div className="absolute top-2.5 right-2.5 bg-green-500 text-zinc-950 rounded-full w-5 h-5 flex items-center justify-center text-xs font-black shadow-lg shadow-black/40 pointer-events-none select-none z-10">
                ✓
              </div>

              {/* Remove button overlay on hover */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleRemove}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md rounded-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ✕ Remove Image
                </Button>
              </div>
            </div>
            
            <div className="w-full flex items-center justify-between px-1">
              <div className="flex flex-col truncate max-w-full">
                <span className="text-sm font-medium text-zinc-300 truncate" title={file?.name}>
                  {file?.name}
                </span>
                <span className="text-xs text-zinc-500">
                  {formatFileSize(file?.size)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div 
              {...getRootProps()} 
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center h-64 transition-colors duration-200 select-none
                ${isLoading 
                  ? 'border-zinc-800 bg-zinc-950/20 text-zinc-650 cursor-not-allowed' 
                  : isDragActive 
                    ? 'border-zinc-400 bg-zinc-900/40 text-zinc-200 cursor-pointer' 
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-900/20 text-zinc-400 cursor-pointer'
                }`}
            >
              <input {...getInputProps()} />
              <svg className="w-10 h-10 mb-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <p className="text-sm font-medium text-zinc-300">
                {isDragActive ? "Drop the image here" : "Drag & drop image here"}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                or click to browse files
              </p>
              <p className="text-[10px] text-zinc-600 mt-2 font-mono">
                Max size: {maxSizeMb}MB • JPG, PNG, WEBP
              </p>
            </div>
            {errorMsg && (
              <p className="text-xs font-semibold text-red-500 mt-3 text-center">
                {errorMsg}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
