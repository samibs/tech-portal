import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Spinner } from "@/components/ui/spinner";
import { EndpointStatus } from "@shared/schema";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Trash2, Edit, PlusCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

function EndpointStatusBadge({ status }: { status: EndpointStatus }) {
  switch (status) {
    case EndpointStatus.UP:
      return (
        <Badge className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Up
        </Badge>
      );
    case EndpointStatus.DOWN:
      return (
        <Badge className="bg-red-500 hover:bg-red-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Down
        </Badge>
      );
    case EndpointStatus.DEGRADED:
      return (
        <Badge className="bg-orange-500 hover:bg-orange-600">
          <Clock className="h-3 w-3 mr-1" />
          Degraded
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-500 hover:bg-gray-600">
          <Clock className="h-3 w-3 mr-1" />
          Unknown
        </Badge>
      );
  }
}

type EndpointForm = {
  path: string;
  method: string;
  expectedStatus: number;
  checkFrequency: number;
  appId: number;
  description: string;
};

function AddEndpointDialog({ appId }: { appId?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<EndpointForm>({
    path: "/",
    method: "GET",
    expectedStatus: 200,
    checkFrequency: 60,
    appId: appId || 0,
    description: "",
  });

  const { data: apps } = useQuery({
    queryKey: ["/api/apps"],
    enabled: !appId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await apiRequest("/api/endpoints", {
        method: "POST",
        data: form,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/endpoints"] });
      queryClient.invalidateQueries({ queryKey: [`/api/apps/${form.appId}/endpoints`] });
      
      toast({
        title: "Endpoint created",
        description: `Successfully added endpoint ${form.method} ${form.path}`,
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error creating endpoint",
        description: "Failed to create the endpoint. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Endpoint
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New Endpoint</DialogTitle>
          <DialogDescription>
            Add a new endpoint to monitor for an application.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {!appId && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="appId" className="text-right">
                  Application
                </Label>
                <Select
                  value={form.appId.toString()}
                  onValueChange={(value) => setForm({ ...form, appId: parseInt(value) })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select application" />
                  </SelectTrigger>
                  <SelectContent>
                    {apps?.map((app: any) => (
                      <SelectItem key={app.id} value={app.id.toString()}>
                        {app.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="method" className="text-right">
                Method
              </Label>
              <Select
                value={form.method}
                onValueChange={(value) => setForm({ ...form, method: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="path" className="text-right">
                Path
              </Label>
              <Input
                id="path"
                value={form.path}
                onChange={(e) => setForm({ ...form, path: e.target.value })}
                className="col-span-3"
                placeholder="/api/users"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expectedStatus" className="text-right">
                Expected Status
              </Label>
              <Input
                id="expectedStatus"
                type="number"
                value={form.expectedStatus}
                onChange={(e) => setForm({ ...form, expectedStatus: parseInt(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="checkFrequency" className="text-right">
                Check Frequency (s)
              </Label>
              <Input
                id="checkFrequency"
                type="number"
                value={form.checkFrequency}
                onChange={(e) => setForm({ ...form, checkFrequency: parseInt(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="col-span-3"
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add Endpoint</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function EndpointsPage() {
  const { data: endpoints, isLoading } = useQuery({
    queryKey: ["/api/endpoints"],
  });

  const handleDeleteEndpoint = async (id: number) => {
    if (confirm("Are you sure you want to delete this endpoint?")) {
      try {
        await apiRequest(`/api/endpoints/${id}`, {
          method: "DELETE",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/endpoints"] });
        
        toast({
          title: "Endpoint deleted",
          description: "The endpoint has been removed from monitoring.",
        });
      } catch (error) {
        toast({
          title: "Error deleting endpoint",
          description: "Failed to delete the endpoint. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">API Endpoints</h1>
          <p className="text-muted-foreground">
            Monitor and manage API endpoints across all your applications.
          </p>
        </div>
        <AddEndpointDialog />
      </div>

      <Separator className="my-6" />

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Spinner size="lg" />
        </div>
      ) : !endpoints || endpoints.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Endpoints Found</CardTitle>
            <CardDescription>
              You have not added any endpoints to monitor yet. Add your first endpoint to start monitoring.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <AddEndpointDialog />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>All Monitored Endpoints</CardTitle>
              <CardDescription>
                Monitor the status and response times of all your application endpoints.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map((endpoint: any) => (
                    <TableRow key={endpoint.id}>
                      <TableCell className="font-medium">{endpoint.appName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{endpoint.method}</Badge>
                      </TableCell>
                      <TableCell>{endpoint.path}</TableCell>
                      <TableCell>
                        <EndpointStatusBadge status={endpoint.status} />
                      </TableCell>
                      <TableCell>
                        {endpoint.lastResponseTime ? `${endpoint.lastResponseTime}ms` : "N/A"}
                      </TableCell>
                      <TableCell>
                        {endpoint.lastChecked
                          ? new Date(endpoint.lastChecked).toLocaleString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              queryClient.invalidateQueries({
                                queryKey: [`/api/endpoints/${endpoint.id}`],
                              });
                              toast({
                                title: "Checking endpoint",
                                description: `Manually checking ${endpoint.method} ${endpoint.path}`,
                              });
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              // Edit functionality would go here
                              toast({
                                title: "Edit endpoint",
                                description: "Endpoint editing is not yet implemented",
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteEndpoint(endpoint.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}