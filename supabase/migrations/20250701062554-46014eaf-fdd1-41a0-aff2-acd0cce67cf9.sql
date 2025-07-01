
-- Create parking_entries table
CREATE TABLE public.parking_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plate_number TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('Entry', 'Exit')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_parking_entries_plate_number ON public.parking_entries(plate_number);
CREATE INDEX idx_parking_entries_timestamp ON public.parking_entries(timestamp);
CREATE INDEX idx_parking_entries_entry_type ON public.parking_entries(entry_type);

-- Enable Row Level Security (making it public for now since no authentication is implemented)
ALTER TABLE public.parking_entries ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (since no auth is implemented)
CREATE POLICY "Allow all operations on parking entries" 
  ON public.parking_entries 
  FOR ALL 
  USING (true)
  WITH CHECK (true);
