#!/usr/bin/env node

import { CloudflareTunnelManager } from "./tunnel-manager.js";
import fs from "fs";
import path from "path";

interface ConfigFile {
  apiToken: string;
  accountId: string;
  zoneId?: string;
  tunnelId?: string;
  services?: Array<{
    hostname: string;
    service: string;
    path?: string;
    httpHostHeader?: string;
    noTLSVerify?: boolean;
  }>;
}

function loadConfigFile(configPath: string): ConfigFile {
  const fullPath = path.resolve(configPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`配置文件不存在: ${fullPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error(`配置文件格式错误: ${error}`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const command = args[0];
  const options = parseOptions(args.slice(1));

  // 从环境变量或配置文件获取 API Token 和 Account ID
  const apiToken =
    options.apiToken ||
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CF_API_TOKEN;
  const accountId =
    options.accountId ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CF_ACCOUNT_ID;

  if (!apiToken || !accountId) {
    console.error(
      "错误: 必须提供 CLOUDFLARE_API_TOKEN 和 CLOUDFLARE_ACCOUNT_ID",
    );
    console.log(
      "\n可以通过以下方式提供:\n" +
        "  1. 环境变量: CLOUDFLARE_API_TOKEN 和 CLOUDFLARE_ACCOUNT_ID\n" +
        "  2. 命令行参数: --api-token 和 --account-id\n" +
        "  3. 配置文件: --config <path>",
    );
    process.exit(1);
  }

  const manager = new CloudflareTunnelManager(apiToken, accountId);

  try {
    await executeCommand(manager, command, options);
  } catch (error) {
    console.error(`执行命令失败: ${error}`);
    process.exit(1);
  }
}

function parseOptions(args: string[]): Record<string, string> {
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        options[key] = args[i + 1];
        i++;
      } else {
        options[key] = "true";
      }
    }
  }
  return options;
}

async function executeCommand(
  manager: CloudflareTunnelManager,
  command: string,
  options: Record<string, string>,
): Promise<void> {
  switch (command) {
    case "list":
      await manager.listTunnels();
      break;

    case "show": {
      const tunnelId = options.tunnel || options.tunnelId;
      if (!tunnelId) {
        console.error("错误: 必须提供 --tunnel <id>");
        process.exit(1);
      }
      await manager.showTunnelDetails(tunnelId);
      break;
    }

    case "add": {
      const tunnelId = options.tunnel || options.tunnelId;
      const zoneId = options.zone || options.zoneId;
      const hostname = options.hostname;
      const service = options.service;

      if (!tunnelId || !hostname || !service) {
        console.error("错误: 必须提供 --tunnel, --hostname 和 --service 参数");
        process.exit(1);
      }

      const serviceConfig = {
        hostname,
        service,
        ...(options.path && { path: options.path }),
        ...(options.httpHostHeader && {
          httpHostHeader: options.httpHostHeader,
        }),
        ...(options.noTLSVerify && {
          noTLSVerify: options.noTLSVerify === "true",
        }),
      };

      if (zoneId) {
        await manager.addServiceWithDNS(tunnelId, zoneId, serviceConfig);
      } else {
        await manager.addOrUpdateService(tunnelId, serviceConfig);
      }
      break;
    }

    case "remove": {
      const tunnelId = options.tunnel || options.tunnelId;
      const zoneId = options.zone || options.zoneId;
      const hostname = options.hostname;

      if (!tunnelId || !hostname) {
        console.error("错误: 必须提供 --tunnel 和 --hostname 参数");
        process.exit(1);
      }

      if (zoneId) {
        await manager.removeServiceWithDNS(tunnelId, zoneId, hostname);
      } else {
        await manager.removeService(tunnelId, hostname);
      }
      break;
    }

    case "batch": {
      const tunnelId = options.tunnel || options.tunnelId;
      const zoneId = options.zone || options.zoneId;
      const configPath = options.config;

      if (!tunnelId || !configPath) {
        console.error("错误: 必须提供 --tunnel 和 --config 参数");
        process.exit(1);
      }

      const config = loadConfigFile(configPath);
      if (!config.services) {
        console.error("配置文件中未找到 services 数组");
        process.exit(1);
      }

      await manager.batchUpdateServices(tunnelId, config.services);
      console.log("\n批量更新完成");

      // 如果提供了 zoneId,同时创建/更新 DNS 记录
      if (zoneId) {
        console.log("\n开始更新 DNS 记录...");
        for (const svc of config.services) {
          if (svc.hostname) {
            await manager.createDNSRecord(zoneId, svc.hostname, tunnelId, true);
          }
        }
        console.log("\nDNS 记录更新完成");
      }
      break;
    }

    case "dns-add": {
      const zoneId = options.zone || options.zoneId;
      const hostname = options.hostname;
      const tunnelId = options.tunnel || options.tunnelId;

      if (!zoneId || !hostname || !tunnelId) {
        console.error("错误: 必须提供 --zone, --hostname 和 --tunnel 参数");
        process.exit(1);
      }

      await manager.createDNSRecord(zoneId, hostname, tunnelId, true);
      break;
    }

    case "dns-remove": {
      const zoneId = options.zone || options.zoneId;
      const hostname = options.hostname;

      if (!zoneId || !hostname) {
        console.error("错误: 必须提供 --zone 和 --hostname 参数");
        process.exit(1);
      }

      await manager.deleteDNSRecord(zoneId, hostname);
      break;
    }

    default:
      console.error(`未知命令: ${command}`);
      showHelp();
      process.exit(1);
  }
}

function showHelp() {
  console.log(`
Cloudflare Tunnel 配置管理工具

用法:
  cli.ts <command> [options]

命令:
  list                                          列出所有 tunnels
  show --tunnel <id>                            显示 tunnel 详细配置
  add --tunnel <id> --hostname <name> --service <url> [options]
                                                添加或更新服务
  remove --tunnel <id> --hostname <name>        删除服务
  batch --tunnel <id> --config <file> [--zone <id>]
                                                批量更新服务配置
  dns-add --zone <id> --hostname <name> --tunnel <id>
                                                添加 DNS 记录
  dns-remove --zone <id> --hostname <name>      删除 DNS 记录

选项:
  --api-token <token>           Cloudflare API Token
  --account-id <id>             Cloudflare Account ID
  --tunnel, --tunnel-id <id>    Tunnel ID
  --zone, --zone-id <id>        Zone ID (用于 DNS 操作)
  --hostname <name>             主机名
  --service <url>               后端服务 URL
  --path <pattern>              路径匹配模式(可选)
  --http-host-header <header>   HTTP Host Header(可选)
  --no-tls-verify <bool>        是否禁用 TLS 验证(可选)
  --config <path>               配置文件路径(JSON 格式)

环境变量:
  CLOUDFLARE_API_TOKEN          Cloudflare API Token
  CLOUDFLARE_ACCOUNT_ID         Cloudflare Account ID

示例:
  # 列出所有 tunnels
  cli.ts list

  # 显示 tunnel 配置
  cli.ts show --tunnel abc123...

  # 添加服务(不创建 DNS)
  cli.ts add \\
    --tunnel abc123... \\
    --hostname app.example.com \\
    --service http://localhost:3000

  # 添加服务并创建 DNS 记录
  cli.ts add \\
    --tunnel abc123... \\
    --zone xyz789... \\
    --hostname app.example.com \\
    --service http://localhost:3000

  # 批量更新(从配置文件)
  cli.ts batch \\
    --tunnel abc123... \\
    --config services.json

  # 批量更新并同步 DNS
  cli.ts batch \\
    --tunnel abc123... \\
    --zone xyz789... \\
    --config services.json

配置文件格式(services.json):
  {
    "services": [
      {
        "hostname": "app1.example.com",
        "service": "http://localhost:3000",
        "httpHostHeader": "app1.example.com"
      },
      {
        "hostname": "app2.example.com",
        "service": "http://localhost:3001",
        "noTLSVerify": true
      }
    ]
  }
`);
}

if (import.meta.main) {
  main();
}

export { executeCommand, main, showHelp };
