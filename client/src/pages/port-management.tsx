import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { findProcessByPort, killProcessByPort, getMonitoredPorts, addMonitoredPort, removeMonitoredPort } from '@/lib/api';

interface ProcessInfo {
  pid: number | null;
  name: string | null;
}

interface PortEvent {
  type: 'process-detected' | 'process-gone';
  port: number;
  processInfo: ProcessInfo;
}

export default function PortManagementPage() {
  const { toast } = useToast();
  const [portEvents, setPortEvents] = useState<PortEvent[]>([]);
  const [findPort, setFindPort] = useState<string>('');
  const [foundProcess, setFoundProcess] = useState<ProcessInfo | null>(null);
  const [isFinding, setIsFinding] = useState<boolean>(false);
  const [isKilling, setIsKilling] = useState<boolean>(false);
  const [monitoredPorts, setMonitoredPorts] = useState<number[]>([]);
  const [newPort, setNewPort] = useState<string>('');

  const fetchMonitoredPorts = async () => {
    try {
      const data = await getMonitoredPorts();
      setMonitoredPorts(data.ports);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch monitored ports', variant: 'destructive' });
    }
  };

  const handleAddPort = async (e: React.FormEvent) => {
    e.preventDefault();
    const port = parseInt(newPort, 10);
    if (isNaN(port)) {
      toast({ title: 'Error', description: 'Invalid port number', variant: 'destructive' });
      return;
    }
    try {
      await addMonitoredPort(port);
      fetchMonitoredPorts();
      setNewPort('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add port', variant: 'destructive' });
    }
  };

  const handleRemovePort = async (port: number) => {
    try {
      await removeMonitoredPort(port);
      fetchMonitoredPorts();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove port', variant: 'destructive' });
    }
  };

  const handleKillProcess = async (port: number) => {
    setIsKilling(true);
    try {
      const result = await killProcessByPort(port);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setFoundProcess(null);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to kill process', variant: 'destructive' });
    } finally {
      setIsKilling(false);
    }
  };

  const handleFindProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFinding(true);
    setFoundProcess(null);
    try {
      const port = parseInt(findPort, 10);
      if (isNaN(port)) {
        toast({ title: 'Error', description: 'Invalid port number', variant: 'destructive' });
        return;
      }
      const processInfo = await findProcessByPort(port);
      setFoundProcess(processInfo);
    } catch (error) {
      toast({ title: 'Error', description: 'Process not found or API error', variant: 'destructive' });
    } finally {
      setIsFinding(false);
    }
  };

  useEffect(() => {
    fetchMonitoredPorts();
    const ws = new WebSocket(`ws://${window.location.host}`);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setPortEvents((prevEvents) => [message, ...prevEvents].slice(0, 100));
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Port Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Monitored Ports</CardTitle>
          <CardDescription>
            Real-time status of monitored ports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {portEvents.length === 0 ? (
            <p className="text-muted-foreground">No port events yet. Waiting for server...</p>
          ) : (
            <div className="space-y-4">
              {portEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {event.type === 'process-detected' ? 'Process Detected' : 'Process Gone'} on port {event.port}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {event.processInfo.name} (PID: {event.processInfo.pid || 'N/A'})
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Find Process by Port</CardTitle>
          <CardDescription>
            Find which process is using a specific port.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFindProcess} className="flex items-center space-x-2">
            <Input
              type="number"
              placeholder="Enter port number"
              value={findPort}
              onChange={(e) => setFindPort(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit" disabled={isFinding}>
              {isFinding ? 'Finding...' : 'Find Process'}
            </Button>
          </form>
          {foundProcess && (
            <div className="mt-4 flex items-center justify-between">
              <p>
                Process found on port {findPort}: <strong>{foundProcess.name}</strong> (PID: <strong>{foundProcess.pid}</strong>)
              </p>
              <Button
                variant="destructive"
                onClick={() => handleKillProcess(parseInt(findPort, 10))}
                disabled={isKilling}
              >
                {isKilling ? 'Killing...' : 'Kill Process'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Manage Monitored Ports</CardTitle>
          <CardDescription>
            Add or remove ports from the monitoring list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddPort} className="flex items-center space-x-2">
            <Input
              type="number"
              placeholder="Enter port to monitor"
              value={newPort}
              onChange={(e) => setNewPort(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit">Add Port</Button>
          </form>
          <div className="mt-4 space-y-2">
            {monitoredPorts.map((port) => (
              <div key={port} className="flex items-center justify-between">
                <span>{port}</span>
                <Button variant="destructive" size="sm" onClick={() => handleRemovePort(port)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
