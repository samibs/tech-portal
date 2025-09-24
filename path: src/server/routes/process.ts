content:
```typescript
import { Router } from "express";
import { processManager } from "../services/process-manager";
import { requirePermission } from "../middleware/auth";
import { storage } from "../storage";

const router = Router();

// Get all processes
router.get("/", requirePermission("processes:read"), async (req, res) => {
  try {
    const processes = await processManager.getProcesses();
    res.json(processes);
  } catch (error) {
    console.error("Error fetching processes:", error);
    res.status(500).json({ message: "Failed to fetch processes" });
  }
});

// Get a single process
router.get("/:pid", requirePermission("processes:read"), async (req, res) => {
  try {
    const pid = parseInt(req.params.pid, 10);
    const process = await processManager.getProcess(pid);
    if (!process) {
      return res.status(404).json({ message: "Process not found" });
    }
    res.json(process);
  } catch (error) {
    console.error("Error fetching process:", error);
    res.status(500).json({ message: "Failed to fetch process" });
  }
});

// Kill a process
router.post("/:pid/kill", requirePermission("processes:write"), async (req, res) => {
  try {
    const pid = parseInt(req.params.pid, 10);
    const success = await processManager.killProcess(pid);
    if (success) {
      res.json({ success: true, message: `Process ${pid} killed` });
    } else {
      res.status(500).json({ message: "Failed to kill process" });
    }
  } catch (error) {
    console.error("Error killing process:", error);
    res.status(500).json({ message: "Failed to kill process" });
  }
});

export default router;
```
