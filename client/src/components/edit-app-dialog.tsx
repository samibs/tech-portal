import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppType, ReplitApp } from "@shared/schema";
import { updateApp } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EditAppDialogProps {
  app: ReplitApp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppUpdated: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  replitUrl: z.string().min(1, "Replit URL is required").url("Invalid URL format"),
  port: z.coerce.number().int().min(1, "Port must be at least 1"),
  startCommand: z.string().min(1, "Start command is required"),
  type: z.string().min(1, "Type is required"),
});

export default function EditAppDialog({ 
  app, 
  open, 
  onOpenChange, 
  onAppUpdated 
}: EditAppDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: app.name,
      replitUrl: app.replitUrl,
      port: app.port,
      startCommand: app.startCommand,
      type: app.type,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await updateApp(app.id, values);
      onAppUpdated();
      onOpenChange(false);
      toast({
        title: "Success!",
        description: "Application updated successfully.",
      });
    } catch (error) {
      console.error("Error updating app:", error);
      toast({
        title: "Error",
        description: "Failed to update application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit Application</DialogTitle>
          <DialogDescription>
            Update the details for this Replit application.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My App" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="replitUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Replit URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://myapp.replit.app" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="3000" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={AppType.FRONTEND}>Frontend</SelectItem>
                        <SelectItem value={AppType.BACKEND}>Backend</SelectItem>
                        <SelectItem value={AppType.DATABASE}>Database</SelectItem>
                        <SelectItem value={AppType.OTHER}>Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="startCommand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Command</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="npm start" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update Application"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}