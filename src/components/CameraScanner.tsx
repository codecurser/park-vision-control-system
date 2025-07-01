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

  const preprocessImage = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Advanced image preprocessing for better OCR accuracy
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale with better weights
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      
      // Apply adaptive thresholding and contrast enhancement
      const threshold = 128;
      const contrast = 2.0;  // Increased contrast
      const brightness = 20; // Slight brightness boost
      
      let enhanced = gray;
      
      // Apply contrast and brightness
      enhanced = enhanced * contrast + brightness;
      
      // Apply binary threshold for better character recognition
      enhanced = enhanced > threshold ? 255 : 0;
      
      // Ensure values are within valid range
      enhanced = Math.min(255, Math.max(0, enhanced));
      
      data[i] = enhanced;     // Red
      data[i + 1] = enhanced; // Green
      data[i + 2] = enhanced; // Blue
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const cleanPlateNumber = (text: string): string => {
    // Remove all non-alphanumeric characters and convert to uppercase
    let cleaned = text.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Enhanced OCR corrections for common misreadings
    cleaned = cleaned
      .replace(/O/g, '0')   // Replace O with 0
      .replace(/Q/g, '0')   // Replace Q with 0
      .replace(/I/g, '1')   // Replace I with 1
      .replace(/L/g, '1')   // Replace L with 1
      .replace(/S/g, '5')   // Replace S with 5
      .replace(/Z/g, '2')   // Replace Z with 2
      .replace(/G/g, '6')   // Replace G with 6
      .replace(/B/g, '8')   // Replace B with 8
      .replace(/D/g, '0')   // Replace D with 0 (sometimes confused)
      .replace(/U/g, '0');  // Replace U with 0 (sometimes confused)

    return cleaned;
  };

  const isValidPlateNumber = (plateNumber: string): boolean => {
    // More flexible validation - allow 4-8 characters for better detection
    if (plateNumber.length < 4 || plateNumber.length > 8) {
      return false;
    }
    
    // Must contain at least one letter and one number for typical license plates
    const hasLetters = /[A-Z]/.test(plateNumber);
    const hasNumbers = /[0-9]/.test(plateNumber);
    
    // Accept plates with either letters+numbers or pure alphanumeric
    return hasLetters || hasNumbers;
  };

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setIsProcessing(true);
      
      try {
        console.log('Starting enhanced OCR processing...');
        
        // Create canvas for advanced image preprocessing
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // Set canvas size to original image size
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          // Apply advanced preprocessing
          const processedCanvas = preprocessImage(canvas);
          const processedImageSrc = processedCanvas.toDataURL('image/png');
          
          // Initialize Tesseract worker with enhanced configuration
          const worker = await createWorker('eng');
          
          // Configure Tesseract for optimal license plate recognition
          await worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '8', // Single word mode
            preserve_interword_spaces: '0',
            tessedit_ocr_engine_mode: '1', // Use LSTM OCR engine
            classify_bln_numeric_mode: '1',
          });
          
          console.log('Running enhanced OCR recognition...');
          const { data: { text, confidence } } = await worker.recognize(processedImageSrc);
          await worker.terminate();
          
          console.log('Raw OCR text:', text);
          console.log('OCR confidence:', confidence);
          
          // Clean and validate the extracted text
          const cleanedText = cleanPlateNumber(text);
          console.log('Cleaned text:', cleanedText);
          
          if (isValidPlateNumber(cleanedText) && confidence > 30) {
            setExtractedText(cleanedText);
            toast({
              title: "License Plate Detected",
              description: `Extracted: ${cleanedText} (Confidence: ${confidence.toFixed(1)}%)`,
            });
          } else {
            console.log('Invalid or low confidence plate detected:', cleanedText, 'Confidence:', confidence);
            setExtractedText("");
            toast({
              title: "Plate Detection Failed",
              description: `Unable to detect valid plate. Try better lighting and positioning. (Confidence: ${confidence.toFixed(1)}%)`,
              variant: "destructive",
            });
          }
        };
        
        img.src = imageSrc;
      } catch (error) {
        console.error('Enhanced OCR Error:', error);
        setExtractedText("");
        toast({
          title: "OCR Processing Failed",
          description: "Please try again with better lighting and clearer image",
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
            Enhanced License Plate Scanner
          </CardTitle>
          <CardDescription className="text-blue-100">
            Position the license plate clearly within the frame for optimal recognition
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
                
                {/* Enhanced Overlay Guide */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-yellow-400 border-dashed rounded-lg w-64 h-16 flex items-center justify-center bg-black bg-opacity-30">
                    <span className="text-yellow-400 text-sm font-medium">License Plate Area</span>
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
                    <span>Processing with enhanced OCR...</span>
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
                  <p className="text-gray-500">Capture an image to start enhanced scanning</p>
                )}
              </div>
              
              {/* Enhanced Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Enhanced Scanning Tips</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Use bright, even lighting (avoid shadows)</li>
                  <li>• Position plate straight and centered</li>
                  <li>• Keep camera steady and focused</li>
                  <li>• Ensure plate is clean and clearly visible</li>
                  <li>• Avoid glare and reflections</li>
                  <li>• Get close enough to fill the guide frame</li>
                  <li>• Try multiple angles if first attempt fails</li>
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
