#!/usr/bin/env node

/**
 * 创建 Cloudflare Tunnel
 */

import { CloudflareTunnelManager } from "./src/tunnel-manager.js";

const API_TOKEN =
  process.env.CLOUDFLARE_API_TOKEN ||
  "*****************************************************";
const ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID ||
  "*****************************************************";
const ZONE_ID =
  process.env.CLOUDFLARE_ZONE_ID ||
  "*****************************************************";
const TUNNEL_NAME =
  process.env.TUNNEL_NAME ||
  "*****************************************************";

async function main() {
  console.log("\n=== 创建 Cloudflare Tunnel ===\n");
  console.log(`隧道名称: ${TUNNEL_NAME}`);
  console.log(`Account ID: ${ACCOUNT_ID}`);

  const manager = new CloudflareTunnelManager(API_TOKEN, ACCOUNT_ID);

  // 创建隧道
  const tunnelId = await manager.createTunnel(TUNNEL_NAME, "cloudflare");

  if (tunnelId) {
    console.log("\n✅ 隧道创建成功！");
    console.log(
      "\n此隧道为云端管理模式 (remotely-managed)，配置由 Cloudflare Zero Trust 仪表板管理。",
    );
    console.log("\n下一步:");
    console.log("1. 在服务器上安装 cloudflared");
    console.log("2. 使用 tunnel token 运行:");
    console.log(`   cloudflared tunnel run --token <token>`);
    console.log(
      "\n注意: 隧道配置在 Cloudflare Dashboard 或通过 API 管理，不需要本地 YAML 文件。",
    );
    console.log("\n要添加服务路由吗？告诉我域名和服务地址。");
  } else {
    console.log("\n❌ 隧道创建失败，请检查凭证是否正确。");
    process.exit(1);
  }
}

main();
