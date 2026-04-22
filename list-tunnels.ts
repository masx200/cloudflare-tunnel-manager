import { CloudflareTunnelManager } from "./src/tunnel-manager.js";

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!API_TOKEN || !ACCOUNT_ID) {
  console.error("❌ 请设置环境变量 CLOUDFLARE_API_TOKEN 和 CLOUDFLARE_ACCOUNT_ID");
  process.exit(1);
}

const manager = new CloudflareTunnelManager(API_TOKEN, ACCOUNT_ID);
manager.listTunnels();
