#!/usr/bin/env node

/**
 * 创建 Cloudflare Tunnel
 */

import { CloudflareTunnelManager } from "./src/tunnel-manager.js";

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "*****************************************************";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "*****************************************************";
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || "*****************************************************";
const TUNNEL_NAME = process.env.TUNNEL_NAME || "*****************************************************";

async function main() {
  console.log("\n=== 创建 Cloudflare Tunnel ===\n");
  console.log(`隧道名称: ${TUNNEL_NAME}`);
  console.log(`Account ID: ${ACCOUNT_ID}`);

  const manager = new CloudflareTunnelManager(API_TOKEN, ACCOUNT_ID);

  // 创建隧道
  const tunnelId = await manager.createTunnel(TUNNEL_NAME);

  if (tunnelId) {
    console.log("\n✅ 隧道创建成功！");
    console.log("\n下一步:");
    console.log("1. 在需要暴露的服务器上安装 cloudflared");
    console.log(`2. 使用以下命令连接隧道:`);
    console.log(`   cloudflared service install ${tunnelId}`);
    console.log(`\n或者手动启动:`);
    console.log(`   cloudflared tunnel run --token <token>`);
    console.log("\n要添加服务路由吗？告诉我域名和服务地址。");
  } else {
    console.log("\n❌ 隧道创建失败，请检查凭证是否正确。");
    process.exit(1);
  }
}

main();
