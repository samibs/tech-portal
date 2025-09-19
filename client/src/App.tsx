import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Applications from "@/pages/applications";
import Settings from "@/pages/settings";
import Predictions from "@/pages/predictions";
import AppPrediction from "@/pages/app-prediction";
import Notifications from "@/pages/notifications";
import Endpoints from "@/pages/endpoints";
import Integrations from "@/pages/integrations";
import AppLogs from "@/pages/app-logs";
import ProcessesPage from "@/pages/processes";
import LoginPage from "@/pages/login";
import { ThemeProvider } from "next-themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotificationCenter from "@/components/notification-center";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/applications" component={Applications} />
      <Route path="/predictions" component={Predictions} />
      <Route path="/predictions/:appId" component={AppPrediction} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/settings" component={Settings} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/endpoints" component={Endpoints} />
      <Route path="/endpoints/:appId" component={Endpoints} />
      <Route path="/logs/:appId" component={AppLogs} />
      <Route path="/processes" component={ProcessesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Header() {
  const { user, logout } = useAuth();

  return (
    <div className="fixed top-0 right-0 z-40 p-4">
      <div className="flex items-center space-x-3 bg-background/95 backdrop-blur-sm rounded-lg px-4 py-2 border shadow-lg">
        <NotificationCenter />
        
        <div className="flex items-center space-x-2 px-2 py-1 rounded-md bg-muted/50">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{user?.username}</span>
          {user?.isEmergencyAdmin && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">
              Emergency
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-20">
        <Router />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class">
        <AuthProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <AuthenticatedApp />
            </TooltipProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
