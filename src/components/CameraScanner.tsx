
import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Camera, Scan, Play, Square, Car, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { createWorker } from 'tesseract.js';

interface CameraScannerProps {
  onPlateScanned: (plateNumber: string, entryType: "Entry" | "Exit") => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
}

const CameraScanner = ({ onPlateScanned, isScanning, setIsScanning }: CameraScannerProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [selectedEntryType, setSelectedEntryType] = useState<"Entry" | "Exit">("Entry");

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setIsProcessing(true);
      
      try {
        const worker = await createWorker('eng');
        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        });
        
        const { data: { text } } = await worker.recognize(imageSrc);
        await worker.terminate();
        
        // Clean and format the extracted text
        const cleanedText = text.replace(/[^A-Z0-9]/g, '').trim();
        
        if (cleanedText.length >= 6) {
          setExtractedText(cleanedText);
          toast({
            title: "License Plate Detected",
            description: `Extracted: ${cleanedText}`,
          });
        } else {
          toast({
            title: "No Valid Plate Found",
            description: "Please try again with a clearer image",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('OCR Error:', error);
        toast({
          title: "OCR Processing Failed",
          description: "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  }, [webcamRef]);

  const confirmPlate = () => {
    if (extractedText) {
      onPlateScanned(extractedText, selectedEntryType);
      resetCapture();
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setExtractedText("");
    setIsProcessing(false);
  };

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment" // Use back camera on mobile
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            License Plate Scanner
          </CardTitle>
          <CardDescription className="text-blue-100">
            Position the license plate within the camera frame and capture
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Camera Section */}
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                {!capturedImage ? (
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Overlay Guide */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-blue-400 border-dashed rounded-lg w-64 h-16 flex items-center justify-center bg-black bg-opacity-20">
                    <span className="text-blue-400 text-sm font-medium">License Plate Area</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {!capturedImage ? (
                  <Button 
                    onClick={capture} 
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Plate
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={resetCapture} 
                      variant="outline" 
                      className="flex-1"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Retake
                    </Button>
                    <Button 
                      onClick={capture} 
                      variant="outline"
                      disabled={isProcessing}
                    >
                      <Scan className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {/* Results Section */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Scan Results</h3>
                
                {isProcessing ? (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Processing image...</span>
                  </div>
                ) : extractedText ? (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-500">Detected Plate Number:</p>
                      <p className="text-xl font-mono font-bold text-gray-900">{extractedText}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Entry Type:</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={selectedEntryType === "Entry" ? "default" : "outline"}
                          onClick={() => setSelectedEntryType("Entry")}
                          className="flex items-center gap-1"
                        >
                          <ArrowRight className="h-3 w-3" />
                          Entry
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedEntryType === "Exit" ? "default" : "outline"}
                          onClick={() => setSelectedEntryType("Exit")}
                          className="flex items-center gap-1"
                        >
                          <ArrowLeft className="h-3 w-3" />
                          Exit
                        </Button>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={confirmPlate}
                      className="w-full"
                      disabled={!extractedText}
                    >
                      <Car className="h-4 w-4 mr-2" />
                      Record {selectedEntryType}
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500">Capture an image to start scanning</p>
                )}
              </div>
              
              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Scanning Tips</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Ensure good lighting conditions</li>
                  <li>• Keep the plate within the guide frame</li>
                  <li>• Make sure the plate is clearly visible</li>
                  <li>• Avoid glare and reflections</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraScanner;
