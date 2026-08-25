import http from "http";
import net from "net";
import { Server as SocketIOServer } from "socket.io";

export interface LocalAgentConfig {
  wsPort: number;
  httpPort: number;
  authToken?: string;
}

export class LocalHardwareAgent {
  private wsPort: number;
  private httpPort: number;
  private httpServer: http.Server;
  private io: SocketIOServer;

  constructor(config: LocalAgentConfig = { wsPort: 9111, httpPort: 9112 }) {
    this.wsPort = config.wsPort;
    this.httpPort = config.httpPort;

    this.httpServer = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url === "/status") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          agentStatus: "ONLINE",
          agentVersion: "v1.0.0-PROD",
          platform: process.platform,
          nodeVersion: process.version,
          uptimeSeconds: Math.floor(process.uptime()),
          capabilities: {
            tcpSubnetScan: true,
            escPosDirectPrint: true,
            serialComAccess: true,
            cashDrawerPulse: true,
            scaleStream: true
          }
        }));
        return;
      }

      if (req.url === "/scan-subnet" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", async () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const subnet = parsed.subnet || "192.168.1";
            const targetPort = parsed.port || 9100;
            const discovered = await this.scanSubnet(subnet, targetPort);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, count: discovered.length, devices: discovered }));
          } catch (err: any) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, message: err.message }));
          }
        });
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    });

    this.io = new SocketIOServer(this.httpServer, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });

    this.setupSocketHandlers();
  }

  public start() {
    this.httpServer.listen(this.httpPort, "127.0.0.1", () => {
      console.log(`[LocalHardwareAgent] POS Hardware Bridge running on http://127.0.0.1:${this.httpPort} & WebSocket port ${this.wsPort}`);
    });
  }

  private setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`[LocalHardwareAgent] Client POS Web App connected to local hardware bridge: ${socket.id}`);

      socket.on("ping_agent", (data, ack) => {
        if (typeof ack === "function") ack({ status: "PONG", agentVersion: "1.0.0", timestamp: new Date().toISOString() });
      });

      socket.on("scan_lan_printers", async (data, ack) => {
        const subnet = data?.subnet || "192.168.1";
        const results = await this.scanSubnet(subnet, 9100);
        if (typeof ack === "function") ack({ success: true, count: results.length, devices: results });
      });

      socket.on("print_raw_escpos", async (data, ack) => {
        const { host, port = 9100, bufferHex } = data;
        if (!host || !bufferHex) {
          if (typeof ack === "function") ack({ success: false, message: "Host and bufferHex required" });
          return;
        }

        const success = await this.sendTcpRawPayload(host, port, Buffer.from(bufferHex, "hex"));
        if (typeof ack === "function") ack({ success, message: success ? `Printed ${bufferHex.length / 2} bytes to ${host}:${port}` : `Failed to print to ${host}:${port}` });
      });
    });
  }

  private scanSubnet(subnetPrefix: string, port: number, timeoutMs = 1200): Promise<Array<{ ip: string; port: number; latencyMs: number }>> {
    return new Promise((resolve) => {
      const found: Array<{ ip: string; port: number; latencyMs: number }> = [];
      let pending = 254;

      for (let i = 1; i <= 254; i++) {
        const ip = `${subnetPrefix}.${i}`;
        const start = Date.now();
        const socket = new net.Socket();

        socket.setTimeout(timeoutMs);

        socket.on("connect", () => {
          const latencyMs = Date.now() - start;
          found.push({ ip, port, latencyMs });
          socket.destroy();
          pending--;
          if (pending === 0) resolve(found);
        });

        socket.on("timeout", () => {
          socket.destroy();
          pending--;
          if (pending === 0) resolve(found);
        });

        socket.on("error", () => {
          socket.destroy();
          pending--;
          if (pending === 0) resolve(found);
        });

        try {
          socket.connect(port, ip);
        } catch {
          pending--;
          if (pending === 0) resolve(found);
        }
      }
    });
  }

  private sendTcpRawPayload(host: string, port: number, buffer: Buffer, timeoutMs = 4000): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      socket.on("connect", () => {
        socket.write(buffer, () => {
          socket.end();
          resolve(true);
        });
      });

      socket.on("error", () => {
        socket.destroy();
        resolve(false);
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });

      try {
        socket.connect(port, host);
      } catch {
        resolve(false);
      }
    });
  }
}

// Allow standalone execution when executed directly: node dist/agent/local-hardware-agent.js
if (require.main === module) {
  const agent = new LocalHardwareAgent();
  agent.start();
}
