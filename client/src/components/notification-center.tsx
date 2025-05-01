import { useState } from "react";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Bell, 
  BellOff, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Trash2, 
  Check, 
  ExternalLink 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  
  // Mark all as read when opening the notification center
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };
  
  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <>
              <Bell className="h-5 w-5" />
              <Badge 
                className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 p-0 bg-primary text-white rounded-full"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            </>
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full max-w-sm sm:max-w-md">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex justify-between items-center">
            <span>Notifications</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearNotifications}
              disabled={notifications.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </SheetTitle>
        </SheetHeader>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <BellOff className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium">No Notifications</h3>
            <p className="text-sm">You're all caught up!</p>
          </div>
        ) : (
          <ScrollArea className="h-[70vh] mt-4 -mr-4 pr-4">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                  onRead={markAsRead} 
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
  };
  
  return (
    <Card 
      className={`transition-all ${!notification.read ? 'border-l-4 border-l-primary' : ''}`}
      onClick={handleClick}
    >
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-medium flex justify-between items-center">
          <div className="flex items-center">
            {getNotificationIcon(notification.type)}
            <span className="ml-2">{notification.title}</span>
          </div>
          {!notification.read && (
            <Badge variant="outline" className="ml-2 h-5 py-0 px-1 bg-blue-50 text-blue-700 border-blue-200">
              <span className="sr-only">New</span>
              <span className="flex w-1 h-1 rounded-full bg-blue-600"></span>
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1 pb-1 text-sm text-muted-foreground">
        {notification.message}
      </CardContent>
      <CardFooter className="p-3 pt-1 flex justify-between items-center text-xs text-muted-foreground">
        <span>{formatTimestamp(notification.timestamp)}</span>
        
        {notification.link && (
          <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
            <Link to={notification.link}>
              <ExternalLink className="h-3 w-3 mr-1" />
              View
            </Link>
          </Button>
        )}
        
        {notification.appId && (
          <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
            <Link to={`/predictions/${notification.appId}`}>
              <ExternalLink className="h-3 w-3 mr-1" />
              View Predictions
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "info":
      return <Info className="h-4 w-4 text-blue-500" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}