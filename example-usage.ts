#!/usr/bin/env node

/**
 * Cloudflare Tunnel 管理示例脚本
 *
 * 此脚本展示如何使用 CloudflareTunnelManager 类来管理 tunnel 配置
 */

import { CloudflareTunnelManager } from "./src/tunnel-manager.js";

// 配置信息(建议从环境变量读取)
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "your_api_token";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "your_account_id";
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || "your_zone_id";
const TUNNEL_ID = process.env.CLOUDFLARE_TUNNEL_ID || "your_tunnel_id";

async function exampleListTunnels() {
  console.log("\n=== 示例 1: 列出所有 Tunnels ===\n");

  const manager = new CloudflareTunnelManager(API_TOKEN, ACCOUNT_ID);
  await manager.listTunnels();
}

async function exampleShowTunnelConfig() {
  console.log("\n=== 示例 2: 显示 Tunnel 配置 ===\n");

  const manager = new CloudflareTunnelManager(API_TOKEN, ACCOUNT_ID);
  await manager.showTunnelDetails(TUNNEL_ID);
}

async function exampleAddSingleService() {
  console.log("\n=== 示例 3: 添加单个服务 ===\n");

  const manager = new CloudflareTunnelManager(API_TOKEN, ACCOUNT_ID);

  const serviceConfig = {
    hostname: "new-app.example.com",
    service: "http://127.0.0.1:5000",
    httpHostHeader: "new-app.example.com",
  };

  await manager.addOrUpdateService(TUNNEL_ID, serviceConfig);

  // 同时创建 DNS 记录
  await manager.createDNSRecord(ZONE_ID, serviceConfig.hostname, TUNNEL_ID);
}

async function exampleAddServiceWithDNS() {
  console.log("\n=== 示例 4: 添加服务并自动创建 DNS ===\n");

  const manager = new CloudflareTunnelManager(API_TOKEN, ACCOUNT_ID);

  const serviceConfig = {
    hostname: "auto-dns.example.com",
    service: "http://127.0.0.1:6000",
    httpHostHeader: "auto-dns.example.com",
  };

  // 一次性完成 tunnel 配置和 DNS 记录创建
  await manager.addServiceWithDNS(TUNNEL_ID, ZONE_ID, serviceConfig);
}

async function exampleBatchUpdate() {
  console.log("\n=== 示例 5: 批量更新服务配置 ===\n");

  const manager = new CloudflareTunnelManager(API_TOKEN, ACCOUNT_ID);

  const services = [
    {
      hostname: "app1.example.com",
      service: "http://127.0.0.1:8001",
    },
    {
      hostname: "app2.example.com",
      service: "http://127.0.0.1:8002",
      httpHostHeader: "app2.example.com",
    },
    {
      hostname: "app3.example.com",
      service: "http://127.0.0.1:8003",
      path: "/api/*",
    },
    {
      hostname: "webdav.example.com",
      service: "http://localhost:7443",
      noTLSVerify: true,
    },
  ];

  await manager.batchUpdateServices(TUNNEL_ID, services);
}

async function exampleRemoveService() {
  console.log("\n=== 示例 6: 删除服务 ===\n");

  const manager = new CloudflareTunnelManager(API_TOKEN, ACCOUNT_ID);

  const hostname = "old-app.example.com";

  // 仅删除 tunnel 配置
  await manager.removeService(TUNNEL_ID, hostname);

  // 同时删除 DNS 记录
  await manager.removeServiceWithDNS(TUNNEL_ID, ZONE_ID, hostname);
}

async function exampleComplexConfiguration() {
  console.log("\n=== 示例 7: 复杂配置示例 ===\n");

  const manager = new CloudflareTunnelManager(API_TOKEN, ACCOUNT_ID);

  // 获取当前配置
  const currentConfig = await manager.getTunnelConfig(TUNNEL_ID);
  console.log("当前配置:", JSON.stringify(currentConfig, null, 2));

  // 添加新服务
  await manager.addOrUpdateService(TUNNEL_ID, {
    hostname: "complex.example.com",
    service: "https://192.168.1.100:8443",
    httpHostHeader: "complex.example.com",
    noTLSVerify: true,
  });

  // 显示更新后的配置
  await manager.showTunnelDetails(TUNNEL_ID);
}

async function exampleDNSSync() {
  console.log("\n=== 示例 8: 同步 Tunnel 配置到 DNS ===\n");

  const manager = new CloudflareTunnelManager(API_TOKEN, ACCOUNT_ID);

  // 获取 tunnel 配置
  const config = await manager.getTunnelConfig(TUNNEL_ID);
  if (!config) {
    console.error("无法获取 tunnel 配置");
    return;
  }

  // 为所有 hostname 创建 DNS 记录
  for (const rule of config.ingress) {
    if (rule.hostname) {
      await manager.createDNSRecord(ZONE_ID, rule.hostname, TUNNEL_ID);
    }
  }
}

// 主函数 - 选择要运行的示例
async function main() {
  const example = process.argv[2] || "list";

  const examples: Record<string, () => Promise<void>> = {
    list: exampleListTunnels,
    show: exampleShowTunnelConfig,
    add: exampleAddSingleService,
    addDNS: exampleAddServiceWithDNS,
    batch: exampleBatchUpdate,
    remove: exampleRemoveService,
    complex: exampleComplexConfiguration,
    sync: exampleDNSSync,
  };

  if (examples[example]) {
    try {
      await examples[example]();
    } catch (error) {
      console.error("执行示例失败:", error);
      process.exit(1);
    }
  } else {
    console.log(`
使用方法:
  ts-node example-usage.ts <example>

可用的示例:
  list    - 列出所有 tunnels
  show    - 显示 tunnel 配置
  add     - 添加单个服务
  addDNS  - 添加服务并创建 DNS
  batch   - 批量更新服务
  remove  - 删除服务
  complex - 复杂配置示例
  sync    - 同步配置到 DNS

环境变量:
  CLOUDFLARE_API_TOKEN     - Cloudflare API Token
  CLOUDFLARE_ACCOUNT_ID    - Cloudflare Account ID
  CLOUDFLARE_ZONE_ID       - Cloudflare Zone ID
  CLOUDFLARE_TUNNEL_ID     - Cloudflare Tunnel ID
`);
  }
}

if (import.meta.main) {
  main();
}
