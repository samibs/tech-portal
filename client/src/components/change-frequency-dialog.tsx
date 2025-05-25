import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Clock } from "lucide-react";
import { updateSettings } from "@/lib/api";

interface ChangeFrequencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFrequency: number;
  onFrequencyChanged: () => void;
}

export default function ChangeFrequencyDialog({ 
  open, 
  onOpenChange,
  currentFrequency,
  onFrequencyChanged 
}: ChangeFrequencyDialogProps) {
  const [frequency, setFrequency] = useState(currentFrequency);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Update frequency when props change
  useEffect(() => {
    if (open) {
      setFrequency(currentFrequency);
    }
  }, [open, currentFrequency]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 5 && value <= 300) {
      setFrequency(value);
    }
  };

  const handleSliderChange = (value: number[]) => {
    setFrequency(value[0]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await updateSettings({ checkFrequency: frequency });
      onOpenChange(false);
      onFrequencyChanged();
    } catch (error) {
      console.error("Error updating frequency:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change Check Frequency</DialogTitle>
          <DialogDescription>
            Set how often ReplitMaster should check the status of your applications.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div>
            <label htmlFor="check-frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Check Frequency (seconds)
            </label>
            <Input
              type="number"
              name="check-frequency"
              id="check-frequency"
              min={5}
              max={300}
              value={frequency}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </label>
            <div className="mt-1 relative">
              <Slider
                value={[frequency]}
                min={5}
                max={300}
                step={1}
                onValueChange={handleSliderChange}
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 w-full px-1 mt-1">
                <span>5s</span>
                <span>30s</span>
                <span>60s</span>
                <span>3m</span>
                <span>5m</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Setting a lower frequency may increase system load. Recommended range: 30-60 seconds.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Clock className="-ml-1 mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
