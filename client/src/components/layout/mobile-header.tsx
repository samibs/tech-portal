import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <div className="md:hidden flex items-center justify-between px-4 py-2 bg-primary-700 dark:bg-gray-800 text-white">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onMenuClick}
        className="text-white hover:text-white hover:bg-primary-600 dark:hover:bg-gray-700"
      >
        <Menu className="h-6 w-6" />
      </Button>
      <div className="flex items-center justify-center">
        <Zap className="w-5 h-5 mr-2" />
        <span className="text-lg font-semibold tracking-wider">Tech Portal</span>
      </div>
      <ThemeToggle />
    </div>
  );
}
