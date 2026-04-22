import { CloudflareTunnelManager } from "./src/tunnel-manager.js";

const manager = new CloudflareTunnelManager(
  "*****************************************************",
  "*****************************************************",
);
manager.listTunnels();
