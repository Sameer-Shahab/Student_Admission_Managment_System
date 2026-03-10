'use client';

import { useState, useRef } from 'react';
import { api, UploadResponse } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';

export default function UploadPage() {
  const { theme } = useTheme();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setUseCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Could not access camera. Please check permissions.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            stopCamera();
            setResult(null);
            setError(null);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file or capture a photo');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.uploadDocument(selectedFile);
      setResult(response);
      
      // Clear form after successful upload
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
      <h1 className={`text-2xl md:text-3xl font-bold mb-4 md:mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Upload Student Document</h1>

      <div className={`rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6 border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-lg md:text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Choose Upload Method</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={useCamera}
            className="flex items-center justify-center space-x-3 bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl">📁</span>
            <span className="font-semibold">Choose File</span>
          </button>

          <button
            onClick={useCamera ? stopCamera : startCamera}
            className={`flex items-center justify-center space-x-3 px-6 py-4 rounded-lg transition ${
              useCamera
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-[#f9a470] hover:bg-[#bc556f] text-white'
            }`}
          >
            <span className="text-2xl">{useCamera ? '⏹️' : '📷'}</span>
            <span className="font-semibold">{useCamera ? 'Stop Camera' : 'Use Camera'}</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Camera View */}
        {useCamera && (
          <div className="mb-6">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
              />
              <button
                onClick={capturePhoto}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#f9a470] text-white px-4 md:px-6 py-2 md:py-3 rounded-full font-semibold hover:bg-[#bc556f] transition shadow-lg text-sm md:text-base"
              >
                📸 Capture Photo
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Preview */}
        {previewUrl && !useCamera && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Preview</h3>
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full h-auto mx-auto rounded"
                style={{ maxHeight: '400px' }}
              />
              <div className="mt-3 text-sm text-gray-600">
                <p><strong>File:</strong> {selectedFile?.name}</p>
                <p><strong>Size:</strong> {(((selectedFile?.size || 0) / 1024) / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {selectedFile && !useCamera && (
          <div className="flex space-x-4">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                '📤 Upload & Process'
              )}
            </button>

            <button
              onClick={handleReset}
              disabled={uploading}
              className="px-4 md:px-6 py-2 md:py-3 border-2 border-gray-600 text-gray-300 rounded-lg font-semibold hover:bg-gray-700 transition disabled:opacity-50 text-sm md:text-base"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
          <div className="flex items-center">
            <span className="text-2xl mr-3">❌</span>
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Result */}
      {result && result.success && (
        <div className="bg-[#f9a470]/10 border-l-4 border-[#f9a470] p-6 rounded-lg">
          <div className="flex items-center mb-4">
            <span className="text-3xl mr-3">✅</span>
            <div>
              <h3 className="text-xl font-semibold text-[#f9a470]">{result.message}</h3>
            </div>
          </div>

          {result.student && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-base md:text-lg mb-3 text-white">Extracted Student Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-600">Student ID:</span>
                  <span className="ml-2 font-semibold">{result.student.student_id}</span>
                </div>
                <div>
                  <span className="text-gray-600">Full Name:</span>
                  <span className="ml-2 font-semibold">{result.student.full_name}</span>
                </div>
                {result.student.email && (
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-semibold">{result.student.email}</span>
                  </div>
                )}
                {result.student.phone && (
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-semibold">{result.student.phone}</span>
                  </div>
                )}
                {result.student.department && (
                  <div>
                    <span className="text-gray-600">Department:</span>
                    <span className="ml-2 font-semibold">{result.student.department}</span>
                  </div>
                )}
                {result.student.program && (
                  <div>
                    <span className="text-gray-600">Program:</span>
                    <span className="ml-2 font-semibold">{result.student.program}</span>
                  </div>
                )}
              </div>

              {result.ocr_result?.photo_extracted && (
                <div className="mt-4 text-[#f9a470] flex items-center">
                  <span className="text-xl mr-2">📸</span>
                  <span>Student photo extracted successfully</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 md:p-6 mt-4 md:mt-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 text-blue-300">📋 Instructions</h3>
        <ul className="space-y-2 text-blue-200 text-sm md:text-base">
          <li>• <strong>File Upload:</strong> Click "Choose File" and select an image or PDF of the student document</li>
          <li>• <strong>Camera Capture:</strong> Click "Use Camera" to capture a live photo of the document</li>
          <li>• <strong>Supported Formats:</strong> JPG, PNG, PDF, TIFF, BMP</li>
          <li>• <strong>OCR Processing:</strong> The system will automatically extract text and student information</li>
          <li>• <strong>Photo Detection:</strong> Student photos will be automatically detected and saved</li>
          <li>• <strong>Best Practices:</strong> Ensure good lighting and clear, legible text for best OCR results</li>
        </ul>
      </div>
    </div>
  );
}
