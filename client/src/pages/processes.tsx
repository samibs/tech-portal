import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Zap, AlertTriangle, Activity, Network, HardDrive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProcessInfo {
  pid: number;
  port: number;
  command: string;
  cpu: number;
  memory: number;
  uptime: number;
  status: 'running' | 'zombie' | 'orphaned' | 'listening';
  ppid: number;
  user: string;
}

interface PortInfo {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'LISTEN' | 'ESTABLISHED' | 'TIME_WAIT' | 'CLOSE_WAIT';
  pid: number;
  process: string;
  address: string;
}

interface SystemResources {
  summary: {
    totalCpu: number;
    totalMemory: number;
    processCount: number;
    portCount: number;
  };
  topConsumers: {
    cpu: ProcessInfo[];
    memory: ProcessInfo[];
  };
}

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [ghostProcesses, setGhostProcesses] = useState<ProcessInfo[]>([]);
  const [systemResources, setSystemResources] = useState<SystemResources | null>(null);
  const [portUsage, setPortUsage] = useState<{ used: number[], available: number[], conflicts: PortInfo[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const [processesRes, portsRes, ghostRes, resourcesRes, usageRes] = await Promise.all([
        fetch('/api/process/processes'),
        fetch('/api/process/ports'),
        fetch('/api/process/processes/ghosts'),
        fetch('/api/process/system/resources'),
        fetch('/api/process/ports/usage')
      ]);

      if (processesRes.ok) {
        const processesData = await processesRes.json();
        setProcesses(processesData);
      }

      if (portsRes.ok) {
        const portsData = await portsRes.json();
        setPorts(portsData);
      }

      if (ghostRes.ok) {
        const ghostData = await ghostRes.json();
        setGhostProcesses(ghostData);
      }

      if (resourcesRes.ok) {
        const resourcesData = await resourcesRes.json();
        setSystemResources(resourcesData);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setPortUsage(usageData);
      }
    } catch (error) {
      console.error('Error fetching process data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch process monitoring data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const killProcess = async (pid: number) => {
    try {
      const response = await fetch(`/api/process/processes/${pid}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Process ${pid} terminated successfully`
        });
        fetchData(true);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to terminate process',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to terminate process',
        variant: 'destructive'
      });
    }
  };

  const killProcessOnPort = async (port: number) => {
    try {
      const response = await fetch(`/api/process/ports/${port}/processes`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Processes on port ${port} terminated successfully`
        });
        fetchData(true);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to terminate processes on port',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to terminate processes on port',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    const variants = {
      running: 'default',
      zombie: 'destructive',
      orphaned: 'secondary',
      listening: 'default'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status}
      </Badge>
    );
  };

  const getStateBadge = (state: string) => {
    const variants = {
      LISTEN: 'default',
      ESTABLISHED: 'default',
      TIME_WAIT: 'secondary',
      CLOSE_WAIT: 'secondary'
    } as const;

    return (
      <Badge variant={variants[state as keyof typeof variants] || 'default'}>
        {state}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading process monitoring data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Process & Port Monitor</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of system processes, ports, and resource usage
          </p>
        </div>
        <Button onClick={() => fetchData(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* System Overview */}
      {systemResources && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Processes</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemResources.summary.processCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Ports</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemResources.summary.portCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemResources.summary.totalCpu.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemResources.summary.totalMemory.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ghost Processes Alert */}
      {ghostProcesses.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{ghostProcesses.length} ghost processes detected!</strong> These processes may be consuming resources unnecessarily.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="processes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="processes">Processes</TabsTrigger>
          <TabsTrigger value="ports">Ports</TabsTrigger>
          <TabsTrigger value="ghosts">Ghost Processes</TabsTrigger>
          <TabsTrigger value="resources">Resource Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="processes">
          <Card>
            <CardHeader>
              <CardTitle>Running Processes</CardTitle>
              <CardDescription>
                All currently running processes on the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PID</TableHead>
                    <TableHead>Command</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>CPU %</TableHead>
                    <TableHead>Memory %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processes.map((process) => (
                    <TableRow key={process.pid}>
                      <TableCell className="font-mono">{process.pid}</TableCell>
                      <TableCell className="font-mono text-sm max-w-xs truncate">
                        {process.command}
                      </TableCell>
                      <TableCell>{process.user}</TableCell>
                      <TableCell>{process.cpu.toFixed(1)}%</TableCell>
                      <TableCell>{process.memory.toFixed(1)}%</TableCell>
                      <TableCell>{getStatusBadge(process.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => killProcess(process.pid)}
                        >
                          Kill
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ports">
          <Card>
            <CardHeader>
              <CardTitle>Active Ports</CardTitle>
              <CardDescription>
                Network ports currently in use on the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Port</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Process</TableHead>
                    <TableHead>PID</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ports.map((port, index) => (
                    <TableRow key={`${port.port}-${index}`}>
                      <TableCell className="font-mono">{port.port}</TableCell>
                      <TableCell>{port.protocol.toUpperCase()}</TableCell>
                      <TableCell>{getStateBadge(port.state)}</TableCell>
                      <TableCell>{port.process}</TableCell>
                      <TableCell className="font-mono">{port.pid}</TableCell>
                      <TableCell className="font-mono">{port.address}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => killProcessOnPort(port.port)}
                        >
                          Kill Process
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ghosts">
          <Card>
            <CardHeader>
              <CardTitle>Ghost Processes</CardTitle>
              <CardDescription>
                Zombie or orphaned processes that may need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ghostProcesses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No ghost processes detected
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PID</TableHead>
                      <TableHead>Command</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>CPU %</TableHead>
                      <TableHead>Memory %</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ghostProcesses.map((process) => (
                      <TableRow key={process.pid}>
                        <TableCell className="font-mono">{process.pid}</TableCell>
                        <TableCell className="font-mono text-sm max-w-xs truncate">
                          {process.command}
                        </TableCell>
                        <TableCell>{process.user}</TableCell>
                        <TableCell>{process.cpu.toFixed(1)}%</TableCell>
                        <TableCell>{process.memory.toFixed(1)}%</TableCell>
                        <TableCell>{getStatusBadge(process.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => killProcess(process.pid)}
                          >
                            Kill
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {systemResources && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Top CPU Consumers</CardTitle>
                    <CardDescription>
                      Processes using the most CPU resources
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PID</TableHead>
                          <TableHead>Command</TableHead>
                          <TableHead>CPU %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {systemResources.topConsumers.cpu.map((process) => (
                          <TableRow key={process.pid}>
                            <TableCell className="font-mono">{process.pid}</TableCell>
                            <TableCell className="font-mono text-sm max-w-xs truncate">
                              {process.command}
                            </TableCell>
                            <TableCell>{process.cpu.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Memory Consumers</CardTitle>
                    <CardDescription>
                      Processes using the most memory resources
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PID</TableHead>
                          <TableHead>Command</TableHead>
                          <TableHead>Memory %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {systemResources.topConsumers.memory.map((process) => (
                          <TableRow key={process.pid}>
                            <TableCell className="font-mono">{process.pid}</TableCell>
                            <TableCell className="font-mono text-sm max-w-xs truncate">
                              {process.command}
                            </TableCell>
                            <TableCell>{process.memory.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {portUsage && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Port Usage Summary</CardTitle>
                  <CardDescription>
                    Overview of port availability and conflicts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Used Ports ({portUsage.used.length})</h4>
                      <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
                        {portUsage.used.slice(0, 20).join(', ')}
                        {portUsage.used.length > 20 && '...'}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Available Ports ({portUsage.available.length})</h4>
                      <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
                        {portUsage.available.slice(0, 20).join(', ')}
                        {portUsage.available.length > 20 && '...'}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Port Conflicts ({portUsage.conflicts.length})</h4>
                      {portUsage.conflicts.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No conflicts detected</div>
                      ) : (
                        <div className="text-sm text-destructive max-h-32 overflow-y-auto">
                          {portUsage.conflicts.map(conflict => conflict.port).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
