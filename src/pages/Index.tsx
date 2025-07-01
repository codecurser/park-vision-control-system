
import { useState, useEffect } from "react";
import { Camera, Scan, Car, History, Filter, AlertTriangle } from "lucide-react";
import CameraScanner from "@/components/CameraScanner";
import Dashboard from "@/components/Dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

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

  // Load entries from localStorage on mount
  useEffect(() => {
    const savedEntries = localStorage.getItem("smartpark-entries");
    if (savedEntries) {
      const entries = JSON.parse(savedEntries);
      // Convert timestamp strings back to Date objects
      const entriesWithDates = entries.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));
      setParkingEntries(entriesWithDates);
    }
  }, []);

  // Save entries to localStorage whenever entries change
  useEffect(() => {
    localStorage.setItem("smartpark-entries", JSON.stringify(parkingEntries));
  }, [parkingEntries]);

  const addParkingEntry = (plateNumber: string, entryType: "Entry" | "Exit") => {
    // Check for duplicate entries within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentDuplicate = parkingEntries.find(
      entry => 
        entry.plate_number === plateNumber && 
        entry.entry_type === entryType &&
        entry.timestamp > fiveMinutesAgo
    );

    if (recentDuplicate) {
      toast({
        title: "Duplicate Entry Detected",
        description: `${plateNumber} already has a ${entryType.toLowerCase()} record within the last 5 minutes.`,
        variant: "destructive",
      });
      return;
    }

    const newEntry: ParkingEntry = {
      id: Math.random().toString(36).substr(2, 9),
      plate_number: plateNumber,
      timestamp: new Date(),
      entry_type: entryType,
    };

    setParkingEntries(prev => [newEntry, ...prev]);
    
    toast({
      title: "License Plate Scanned",
      description: `${plateNumber} - ${entryType} recorded successfully`,
    });
  };

  const stats = {
    totalScans: parkingEntries.length,
    todayScans: parkingEntries.filter(entry => 
      entry.timestamp.toDateString() === new Date().toDateString()
    ).length,
    currentlyParked: parkingEntries.filter(entry => entry.entry_type === "Entry").length -
                    parkingEntries.filter(entry => entry.entry_type === "Exit").length,
  };

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
