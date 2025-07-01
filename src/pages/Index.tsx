
import { useState, useEffect } from "react";
import { Camera, Scan, Car, History, Filter, AlertTriangle } from "lucide-react";
import CameraScanner from "@/components/CameraScanner";
import Dashboard from "@/components/Dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { parkingService } from "@/services/parkingService";

export interface ParkingEntry {
  id: string;
  plate_number: string;
  timestamp: Date;
  entry_type: "Entry" | "Exit";
}

const Index = () => {
  const [activeView, setActiveView] = useState<"scan" | "dashboard">("scan");
  const [parkingEntries, setParkingEntries] = useState<ParkingEntry[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load entries from Supabase on mount
  useEffect(() => {
    loadParkingEntries();
  }, []);

  const loadParkingEntries = async () => {
    try {
      setIsLoading(true);
      const entries = await parkingService.getAllEntries();
      setParkingEntries(entries);
      console.log('Loaded parking entries:', entries.length);
    } catch (error) {
      console.error('Failed to load parking entries:', error);
      toast({
        title: "Failed to Load Data",
        description: "Could not load parking entries from database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addParkingEntry = async (plateNumber: string, entryType: "Entry" | "Exit") => {
    try {
      console.log('Adding parking entry:', plateNumber, entryType);
      
      // Check for duplicate entries within 5 minutes
      const isDuplicate = await parkingService.checkDuplicateEntry(plateNumber, entryType);
      
      if (isDuplicate) {
        toast({
          title: "Duplicate Entry Detected",
          description: `${plateNumber} already has a ${entryType.toLowerCase()} record within the last 5 minutes.`,
          variant: "destructive",
        });
        return;
      }

      // Insert new entry into database
      const newEntry = await parkingService.insertEntry(plateNumber, entryType);
      
      if (newEntry) {
        // Add to local state for immediate UI update
        setParkingEntries(prev => [newEntry, ...prev]);
        
        toast({
          title: "License Plate Scanned",
          description: `${plateNumber} - ${entryType} recorded successfully`,
        });
      } else {
        throw new Error('Failed to insert entry');
      }
    } catch (error) {
      console.error('Failed to add parking entry:', error);
      toast({
        title: "Failed to Save Entry",
        description: "Could not save parking entry to database. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stats = {
    totalScans: parkingEntries.length,
    todayScans: parkingEntries.filter(entry => 
      entry.timestamp.toDateString() === new Date().toDateString()
    ).length,
    currentlyParked: parkingEntries.filter(entry => entry.entry_type === "Entry").length -
                    parkingEntries.filter(entry => entry.entry_type === "Exit").length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading SmartPark...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Car className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SmartPark</h1>
                <p className="text-sm text-gray-500">AI-Powered Parking Management</p>
              </div>
            </div>
            
            <nav className="flex space-x-2">
              <Button
                variant={activeView === "scan" ? "default" : "outline"}
                onClick={() => setActiveView("scan")}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Scan
              </Button>
              <Button
                variant={activeView === "dashboard" ? "default" : "outline"}
                onClick={() => setActiveView("dashboard")}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                Dashboard
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Scan className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Scans</p>
                <p className="text-xl font-semibold text-gray-900">{stats.totalScans}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Filter className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Today's Scans</p>
                <p className="text-xl font-semibold text-gray-900">{stats.todayScans}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Car className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Currently Parked</p>
                <p className="text-xl font-semibold text-gray-900">{Math.max(0, stats.currentlyParked)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === "scan" ? (
          <CameraScanner 
            onPlateScanned={addParkingEntry}
            isScanning={isScanning}
            setIsScanning={setIsScanning}
          />
        ) : (
          <Dashboard entries={parkingEntries} />
        )}
      </main>
    </div>
  );
};

export default Index;
