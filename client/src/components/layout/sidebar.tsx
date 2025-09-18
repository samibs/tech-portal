import { Link } from "wouter";
import { BarChart2, Bell, Settings, HelpCircle, Zap, ChevronDown, TrendingUp, Globe, Mail, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface SidebarProps {
  mobileMenuOpen: boolean;
  closeMobileMenu: () => void;
}

export default function Sidebar({ mobileMenuOpen, closeMobileMenu }: SidebarProps) {
  const sidebarContent = (
    <div className="flex flex-col w-64 h-full bg-gray-900 text-white">
      <div className="flex items-center justify-center h-16 px-4 bg-primary-700">
        <div className="flex items-center space-x-2">
          <Zap className="w-8 h-8" />
          <span className="text-xl font-semibold tracking-wider">Tech Portal</span>
        </div>
      </div>
      <div className="flex flex-col flex-grow px-4 py-4">
        <div className="space-y-1">
          <Link href="/">
            <div className="flex items-center px-2 py-2 text-sm font-medium rounded-md bg-primary-700 text-white cursor-pointer">
              <BarChart2 className="mr-3 h-5 w-5 text-white" />
              Dashboard
            </div>
          </Link>
          <Link href="/applications">
            <div className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-primary-600 hover:text-white cursor-pointer">
              <ChevronDown className="mr-3 h-5 w-5 text-gray-400" />
              Applications
            </div>
          </Link>
          <Link href="/predictions">
            <div className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-primary-600 hover:text-white cursor-pointer">
              <TrendingUp className="mr-3 h-5 w-5 text-gray-400" />
              Predictions
            </div>
          </Link>
          <Link href="/processes">
            <div className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-primary-600 hover:text-white cursor-pointer">
              <Activity className="mr-3 h-5 w-5 text-gray-400" />
              Processes
            </div>
          </Link>
          <Link href="/port-management">
            <div className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-primary-600 hover:text-white cursor-pointer">
              <Zap className="mr-3 h-5 w-5 text-gray-400" />
              Port Management
            </div>
          </Link>
          <Link href="/notifications">
            <div className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-primary-600 hover:text-white cursor-pointer">
              <Bell className="mr-3 h-5 w-5 text-gray-400" />
              Notifications
            </div>
          </Link>
          <Link href="/endpoints">
            <div className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-primary-600 hover:text-white cursor-pointer">
              <Globe className="mr-3 h-5 w-5 text-gray-400" />
              Endpoints
            </div>
          </Link>
          <Link href="/settings">
            <div className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-primary-600 hover:text-white cursor-pointer">
              <Settings className="mr-3 h-5 w-5 text-gray-400" />
              Settings
            </div>
          </Link>
          <Link href="/integrations">
            <div className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-primary-600 hover:text-white cursor-pointer">
              <Mail className="mr-3 h-5 w-5 text-gray-400" />
              Integrations
            </div>
          </Link>
          <Link href="#">
            <div className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-primary-600 hover:text-white cursor-pointer">
              <HelpCircle className="mr-3 h-5 w-5 text-gray-400" />
              Help
            </div>
          </Link>
        </div>
      </div>
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Avatar>
              <AvatarImage src="https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Admin user" />
              <AvatarFallback>AU</AvatarFallback>
            </Avatar>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">Admin User</p>
            <p className="text-xs font-medium text-gray-400">View profile</p>
          </div>
        </div>
      </div>
      <div className="p-4 text-center text-xs text-gray-400">
        <p>© 2023 FGS Group. All rights reserved.</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={closeMobileMenu}>
        <SheetContent side="left" className="p-0 w-[300px]">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
