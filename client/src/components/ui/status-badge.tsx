import { AppStatus } from "@shared/schema";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusClasses = () => {
    switch (status) {
      case AppStatus.RUNNING:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case AppStatus.STOPPED:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case AppStatus.UNREACHABLE:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case AppStatus.ERROR:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <span
      className={cn(
        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
        getStatusClasses(),
        className
      )}
    >
      {status}
    </span>
  );
}
