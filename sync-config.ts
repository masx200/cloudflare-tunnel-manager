#!/usr/bin/env node
/**
 * 同步本地配置到 Cloudflare Tunnel 云端
 * 步骤:
 * 1. 读取本地配置文件
 * 2. 检查云端当前配置
 * 3. 对比差异
 * 4. 更新云端配置
 *
 * 使用方法:
 *   node sync-config.js [配置文件路径]
 *
 * 示例:
 *   node sync-config.js
 *   node sync-config.js ./my-config.json
 */

import { CloudflareTunnelManager } from "./src/tunnel-manager.js";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ConfigFile {
  apiToken: string | string[];
  accountId: string;
  zoneId: string;
  tunnelId: string;
  services: Array<{
    service: string;
    hostname?: string;
    originRequest?: {
      httpHostHeader?: string;
      noTLSVerify?: boolean;
    };
  }>;
}

/**
 * 同步本地配置到 Cloudflare Tunnel 云端
 * 功能:
 * - 检查云端当前配置
 * - 对比本地和云端配置差异
 * - 更新云端配置
 * - 显示新增、删除、更新的服务列表
 * - 验证更新结果
 *
 * @param configPath - 配置文件路径(可选,默认使用内置配置文件)
 */
async function main(configPath?: string) {
  console.log("开始同步 Cloudflare Tunnel 配置...\n");

  // 1. 确定配置文件路径
  let finalConfigPath: string;

  if (configPath) {
    // 使用命令行传入的路径
    finalConfigPath = resolve(configPath);
  } else {
    // 使用默认配置文件
    finalConfigPath = join(
      __dirname,
      "services.huggingface-ceuo0ztkqs3qpss.json",
    );
  }

  console.log(`配置文件: ${finalConfigPath}`);

  // 检查文件是否存在
  if (!existsSync(finalConfigPath)) {
    console.error(`✗ 配置文件不存在: ${finalConfigPath}`);
    process.exit(1);
  }

  // 2. 读取配置文件
  let config: ConfigFile;

  try {
    const configContent = readFileSync(finalConfigPath, "utf-8");
    config = JSON.parse(configContent);
    console.log("✓ 已读取本地配置文件");
    console.log(`  Tunnel ID: ${config.tunnelId}`);
    console.log(`  Account ID: ${config.accountId}`);
    console.log(`  Zone ID: ${config.zoneId}`);
  } catch (error) {
    console.error("✗ 读取配置文件失败:", error);
    process.exit(1);
  }

  // 处理 API Token (支持单个或多个)
  const apiTokens = Array.isArray(config.apiToken)
    ? config.apiToken
    : [config.apiToken];
  console.log(`  可用 API Tokens: ${apiTokens.length}`);

  // 尝试所有 token 找到有效的 token
  console.log("\n正在验证 API Tokens...");
  let manager: CloudflareTunnelManager | null = null;

  for (let i = 0; i < apiTokens.length && manager === null; i++) {
    try {
      console.log(`  尝试 Token #${i + 1}...`);
      const testManager = new CloudflareTunnelManager(
        apiTokens[i],
        config.accountId,
      );
      // 尝试获取 tunnel 配置来验证 token
      const tunnelConfig = await testManager.getTunnelConfig(config.tunnelId);
      if (tunnelConfig) {
        console.log(`  ✓ Token #${i + 1} 验证成功`);
        manager = testManager;
        break;
      }
    } catch (error: any) {
      console.log(`  ✗ Token #${i + 1} 失败: ${error.message || "未知错误"}`);
    }
  }

  if (manager === null) {
    console.log("  ⚠ 所有 Token 验证失败,将使用第一个 Token 继续");
    manager = new CloudflareTunnelManager(apiTokens[0], config.accountId);
  }

  // 此时 manager 一定不为 null
  const defaultManager = manager;

  // 2. 检查云端当前配置
  console.log("\n步骤 1: 检查云端当前配置...");
  const currentConfig = await defaultManager.getTunnelConfig(config.tunnelId);

  if (!currentConfig) {
    console.error("✗ 无法获取云端配置");
    process.exit(1);
  }

  console.log("✓ 云端当前配置:");
  console.log(JSON.stringify(currentConfig, null, 2));

  // 3. 转换本地配置为服务数组(排除 catch-all 规则)
  const services = config.services
    .filter((s) => s.hostname) // 只保留有 hostname 的服务
    .map((s) => ({
      hostname: s.hostname!,
      service: s.service,
      httpHostHeader: s.originRequest?.httpHostHeader,
      noTLSVerify: s.originRequest?.noTLSVerify,
    }));

  console.log("\n步骤 2: 本地配置:");
  console.log(JSON.stringify(services, null, 2));

  // 4. 对比差异
  console.log("\n步骤 3: 对比差异...");
  const currentHostnames = new Set(
    currentConfig.ingress
      .map((rule) => rule.hostname)
      .filter((hostname): hostname is string => !!hostname),
  );

  const localHostnames = new Set(services.map((s) => s.hostname));

  const toAdd = [...localHostnames].filter((h) => !currentHostnames.has(h));
  const toRemove = [...currentHostnames].filter((h) => !localHostnames.has(h));
  const toUpdate = [...localHostnames].filter((h) => currentHostnames.has(h));

  console.log(
    `  新增服务 (${toAdd.length}):`,
    toAdd.length > 0 ? toAdd.join(", ") : "无",
  );
  console.log(
    `  删除服务 (${toRemove.length}):`,
    toRemove.length > 0 ? toRemove.join(", ") : "无",
  );
  console.log(
    `  可能需要更新 (${toUpdate.length}):`,
    toUpdate.length > 0 ? toUpdate.join(", ") : "无",
  );

  // 5. 执行更新
  console.log("\n步骤 4: 更新云端配置...");
  const success = await defaultManager.batchUpdateServices(
    config.tunnelId,
    services,
  );

  if (success) {
    console.log("✓ 配置同步成功!");

    // 6. 验证更新结果
    console.log("\n步骤 5: 验证更新结果...");
    const newConfig = await defaultManager.getTunnelConfig(config.tunnelId);
    if (newConfig) {
      console.log("✓ 云端最新配置:");
      console.log(JSON.stringify(newConfig, null, 2));
    }
  } else {
    console.error("✗ 配置同步失败");
    process.exit(1);
  }
}

// 从命令行参数获取配置文件路径
const configPathArg = process.argv[2];

// 显示帮助信息
if (configPathArg === "--help" || configPathArg === "-h") {
  console.log(`
使用方法:
  node sync-config.js [配置文件路径]

参数:
  配置文件路径  可选,指定要使用的配置文件路径
                如果不提供,将使用默认配置文件:
                services.huggingface-ceuo0ztkqs3qpss.json

示例:
  node sync-config.js
  node sync-config.js ./my-config.json
  node sync-config.js /path/to/config.json

选项:
  --help, -h    显示此帮助信息
`);
  process.exit(0);
}

main(configPathArg).catch((error) => {
  console.error("发生错误:", error);
  process.exit(1);
});
