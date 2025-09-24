import React, { useState, useRef, useEffect } from "react";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { Bell, CheckCheck, X, Info, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function NotificationCenter() {
  const { notifications, markAsRead, removeNotification, clearNotifications, unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Mark all visible notifications as read when popover is closed
  useEffect(() => {
    if (!open && notifications.some(n => !n.read)) {
      notifications.forEach(n => {
        if (!n.read) markAsRead(n.id);
      });
    }
  }, [open, notifications, markAsRead]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Format date relative to now
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }

    return date.toLocaleDateString();
  };

  return (
    <div ref={popoverRef}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between p-4 border-b">
            <h4 className="font-medium">Notifications</h4>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground"
                title="Mark all as read"
                onClick={() => notifications.forEach(n => markAsRead(n.id))}
              >
                <CheckCheck className="h-4 w-4" />
                <span className="sr-only">Mark all as read</span>
              </Button>
              <Link href="/notifications">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => setOpen(false)}
                >
                  View all
                </Button>
              </Link>
            </div>
          </div>
          
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 py-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs">You're all caught up!</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[300px]">
                <div className="flex flex-col">
                  {notifications.slice(0, 10).map((notification) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification} 
                      onRead={markAsRead}
                    />
                  ))}
                </div>
              </ScrollArea>
              
              <div className="border-t p-2 flex justify-between">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-muted-foreground"
                  onClick={clearNotifications}
                >
                  Clear all
                </Button>
                <Link href="/notifications">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                    onClick={() => setOpen(false)}
                  >
                    Manage notifications
                  </Button>
                </Link>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  // Using the parent component's formatRelativeTime function
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }

    return date.toLocaleDateString();
  };

  return (
    <div 
      className={cn(
        "flex px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors duration-150",
        !notification.read && "bg-blue-50/50 dark:bg-blue-950/20"
      )}
    >
      <div className="flex-shrink-0 mr-3 mt-0.5">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        {notification.link ? (
          <Link href={notification.link}>
            <a onClick={() => onRead(notification.id)} className="block">
              <p className="text-sm font-medium line-clamp-1">{notification.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(notification.timestamp)}</p>
            </a>
          </Link>
        ) : (
          <div onClick={() => onRead(notification.id)}>
            <p className="text-sm font-medium line-clamp-1">{notification.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(notification.timestamp)}</p>
          </div>
        )}
      </div>
      <button
        className="flex-shrink-0 ml-2 mt-0.5 text-gray-400 hover:text-gray-500 focus:outline-none"
        onClick={(e) => {
          e.stopPropagation();
          onRead(notification.id);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "info":
      return <Info className="h-5 w-5 text-blue-500" />;
    case "success":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "error":
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Bell className="h-5 w-5 text-blue-500" />;
  }
}