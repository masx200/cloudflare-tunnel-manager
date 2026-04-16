#!/usr/bin/env node
/**
 * 检查并同步 DNS 记录
 * 确保所有配置的服务都有对应的 DNS 记录
 * 支持清理无效的 DNS 记录（重复域名、超长、多层嵌套）
 */

import { CloudflareTunnelManager } from "./src/tunnel-manager.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Cloudflare from "cloudflare";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ConfigFile {
  apiToken: string | string[];
  accountId: string;
  zoneId: string | string[];
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

async function main() {
  console.log("开始检查并同步 DNS 记录...\n");

  // 1. 读取配置文件
  const configPath = join(
    __dirname,
    "services.huggingface-ceuo0ztkqs3qpss.json",
  );
  let config: ConfigFile;

  try {
    const configContent = readFileSync(configPath, "utf-8");
    config = JSON.parse(configContent);
    console.log("✓ 已读取本地配置文件");
    console.log(
      `  Zone ID(s): ${
        Array.isArray(config.zoneId) ? config.zoneId.join(", ") : config.zoneId
      }`,
    );
    console.log(`  Tunnel ID: ${config.tunnelId}`);
  } catch (error) {
    console.error("✗ 读取配置文件失败:", error);
    process.exit(1);
  }

  // 处理 API Token (支持单个或多个)
  const apiTokens = Array.isArray(config.apiToken)
    ? config.apiToken
    : [config.apiToken];
  console.log(`  可用 API Tokens: ${apiTokens.length}`);

  // 处理 Zone ID (支持单个或多个)
  const zoneIds = Array.isArray(config.zoneId)
    ? config.zoneId
    : [config.zoneId];
  console.log(`  可用 Zone IDs: ${zoneIds.length}`);

  // 创建管理器实例(使用第一个 token,稍后会用实际可用的 token 替换)
  // 2. 获取所有需要 DNS 记录的主机名
  const requiredHostnames = config.services
    .filter((s) => s.hostname)
    .map((s) => s.hostname!);

  console.log("\n步骤 1: 需要检查的主机名:");
  requiredHostnames.forEach((hostname) => {
    console.log(`  - ${hostname}`);
  });

  try {
    // 3. 获取当前所有 Zone 的所有 DNS 记录 - 尝试所有 token
    console.log("\n步骤 2: 获取当前 DNS 记录...");
    let allDnsRecords: any[] = [];
    let cloudflare: Cloudflare | null = null;
    let tokenFound = false;

    for (let i = 0; i < apiTokens.length && !tokenFound; i++) {
      try {
        console.log(`  尝试使用 Token #${i + 1}...`);
        // 直接使用顶部导入的 Cloudflare 类，而不是动态导入
        cloudflare = new Cloudflare({
          apiToken: apiTokens[i].trim(),
        });
        // 验证 token 是否有效
        console.log(await Array.fromAsync(await cloudflare.zones.list()));
        // 遍历所有 zone ID 获取 DNS 记录
        let recordsFound = 0;
        for (let j = 0; j < zoneIds.length; j++) {
          try {
            console.log(`    查询 Zone #${j + 1}: ${zoneIds[j]}...`);
            const zoneRecords = await cloudflare.dns.records.list({
              zone_id: zoneIds[j],
            });

            // 为每条记录添加 zone_id 信息
            zoneRecords.result.forEach((record: any) => {
              (record as any)._zone_id = zoneIds[j];
            });

            allDnsRecords.push(...zoneRecords.result);
            recordsFound += zoneRecords.result.length;
          } catch (zoneError: any) {
            console.log(
              `      ✗ Zone #${j + 1} 查询失败: ${zoneError.message}`,
            );
          }
        }

        // 如果找到记录或所有 zone 都成功查询（即使没记录），则认为 token 有效
        if (recordsFound > 0 || allDnsRecords.length >= 0) {
          console.log(
            `  ✓ Token #${i + 1} 验证成功 (找到 ${recordsFound} 条记录)`,
          );
          tokenFound = true;
          break; // 成功,退出循环
        }
      } catch (error: any) {
        console.log(
          `  ✗ Token #${i + 1} 失败: ${
            error.status === 403 ? "权限不足" : error.message
          }`,
        );
      }
    }

    if (!tokenFound) {
      console.log("  ⚠ 所有 Token 查询 DNS 记录都失败，将继续尝试创建记录");
      // 不退出，继续执行
    }

    console.log(
      `✓ 总共找到 ${allDnsRecords.length} 条 DNS 记录 (来自 ${zoneIds.length} 个 Zone)`,
    );

    // 3.5. 首先获取所有 Zone 的名称（用于嵌套域名检测）
    console.log("\n步骤 2.5: 获取所有 Zone 信息...");
    const zoneNames = new Map<string, string>();

    // 尝试获取 Zone 信息 - 需要有效的 cloudflare 实例
    let zoneFetchSuccess = false;

    // 如果步骤 2 已经成功找到 token，直接使用
    if (cloudflare && tokenFound) {
      zoneFetchSuccess = true;
    } else {
      // 否则尝试所有 token
      for (let i = 0; i < apiTokens.length && !zoneFetchSuccess; i++) {
        try {
          console.log(`  尝试使用 Token #${i + 1} 获取 Zone 信息...`);
          const tempCf = new Cloudflare({
            apiToken: apiTokens[i].trim(),
          });

          // 尝试获取 zones 列表来验证 token
          console.log(await Array.fromAsync(await tempCf.zones.list()));
          cloudflare = tempCf;
          zoneFetchSuccess = true;
          console.log(`    ✓ Token #${i + 1} 验证成功`);
        } catch (error: any) {
          console.log(`    ✗ Token #${i + 1} 失败: ${error.message}`);
        }
      }
    }

    // 如果找到了有效的 cloudflare 实例，获取所有 zone 信息
    if (cloudflare && zoneFetchSuccess) {
      console.log(`  使用有效 Token 获取 Zone 信息...`);
      // 先获取所有 zones 列表，然后从中找到匹配的 zone
      const allZones = await cloudflare.zones.list();

      for (let i = 0; i < zoneIds.length; i++) {
        try {
          // 从 zones 列表中找到匹配的 zone
          const zoneInfo = allZones.result.find(
            (z: any) => z.id === zoneIds[i],
          );

          if (zoneInfo) {
            const zoneName = zoneInfo.name;
            zoneNames.set(zoneIds[i], zoneName);
            console.log(`  Zone #${i + 1} (${zoneIds[i]}): ${zoneName}`);
          } else {
            console.log(
              `  ✗ Zone #${i + 1} (${zoneIds[i]}) 未在 zones 列表中找到`,
            );
          }
        } catch (zoneError: any) {
          console.log(`  ✗ 获取 Zone #${i + 1} 信息失败: ${zoneError.message}`);
          if (zoneError.response) {
            console.error(
              "    响应详情:",
              JSON.stringify(zoneError.response?.data || zoneError.response),
            );
          }
        }
      }
    } else {
      console.log("  ⚠ 无法获取 Zone 信息：所有 Token 均无效");
    }

    // // 3.6. 识别并处理无效的 DNS 记录
    // console.log("\n步骤 3: 识别无效的 DNS 记录...");

    // // 收集所有 Zone 的名称（用于嵌套域名检测）
    // const allZoneNames = Array.from(zoneNames.values());
    // console.log(`  检测到的 Zone: ${allZoneNames.join(", ")}`);

    // // 查找无效记录
    // const invalidRecords: Array<{ record: any; zoneId: string }> = [];
    // for (const record of allDnsRecords) {
    //   const zoneId = (record as any)._zone_id;
    //   if (isInvalidDnsRecord(record, INVALID_DNS_CONFIG, allZoneNames)) {
    //     invalidRecords.push({ record, zoneId });
    //   }
    // }

    // if (invalidRecords.length > 0) {
    //   console.log(`  ⚠ 发现 ${invalidRecords.length} 条无效 DNS 记录:\n`);

    //   // 打印所有无效记录的详情
    //   invalidRecords.forEach(({ record, zoneId }, index) => {
    //     console.log(`  [${index + 1}] ${record.name}`);
    //     console.log(`      原因: 域名包含多个 Zone 名称（嵌套域名）`);
    //     console.log(`      Zone ID: ${zoneId}`);
    //     console.log(`      记录 ID: ${record.id}`);
    //     console.log("");
    //   });

    //   // 根据配置决定是否删除
    //   // if (INVALID_DNS_CONFIG.autoDelete) {
    //   //   if (!cloudflare) {
    //   //     console.log("  ⚠ 无法删除记录：Cloudflare 实例未初始化");
    //   //   } else {
    //   //     console.log(`\n  正在删除 ${invalidRecords.length} 条无效记录...`);

    //   //     let deletedCount = 0;
    //   //     let failedCount = 0;

    //   //     for (const { record, zoneId } of invalidRecords) {
    //   //       try {
    //   //         // Cloudflare SDK v5+ 语法：dns.records.delete 传入 zone_id 和 dns_record_id 两个参数
    //   //         await cloudflare.dns.records.delete(zoneId, record.id);
    //   //         deletedCount++;
    //   //         console.log(`    ✓ 已删除: ${record.name}`);
    //   //       } catch (error: any) {
    //   //         failedCount++;
    //   //         console.log(`    ✗ 删除失败 ${record.name}: ${error.message}`);
    //   //       }
    //   //     }

    //   //     console.log(
    //   //       `\n  ✓ 删除完成: 成功 ${deletedCount}/${invalidRecords.length}, 失败 ${failedCount}/${invalidRecords.length}`,
    //   //     );
    //   //   }
    //   // } else {
    //   //   console.log(
    //   //     `  ℹ 提示: 如需自动删除无效记录，请将 INVALID_DNS_CONFIG.autoDelete 设置为 true`,
    //   //   );
    //   // }
    // } else {
    //   console.log("  ✓ 未发现无效 DNS 记录");
    // }

    // 4. 检查每个主机名是否有对应的 DNS 记录
    console.log("\n步骤 4: 检查 DNS 记录状态...");
    const existingHostnames = new Set(
      allDnsRecords
        .filter((record: any) => record.type === "CNAME" && record.name)
        .map((record: any) => record.name),
    );

    // 建立主机名到 zone ID 的映射
    const hostnameToZoneId = new Map<string, string>();
    allDnsRecords.forEach((record: any) => {
      if (record.name && (record as any)._zone_id) {
        hostnameToZoneId.set(record.name, (record as any)._zone_id);
      }
    });

    const missingHostnames: string[] = [];
    const existingDnsRecords: string[] = [];

    for (const hostname of requiredHostnames) {
      if (existingHostnames.has(hostname)) {
        existingDnsRecords.push(hostname);
        const zoneId = hostnameToZoneId.get(hostname);
        console.log(`  ✓ ${hostname} - 已存在 (Zone: ${zoneId})`);
      } else {
        missingHostnames.push(hostname);
        console.log(`  ✗ ${hostname} - 缺失`);
      }
    }

    // 5. 为缺失的主机名查找正确的 zone ID
    const hostnameZoneMapping = new Map<string, string>();

    for (const hostname of missingHostnames) {
      console.log(`\n步骤 5: 为 ${hostname} 查找正确的 Zone...`);
      let foundZoneId: string | null = null;

      // 遍历所有 zone ID 查找包含该主机名的 zone
      for (const [zoneId, zoneName] of zoneNames.entries()) {
        console.log(`  检查 Zone: ${zoneId} (${zoneName})...`);

        // 检查主机名是否属于这个 zone
        if (hostname.endsWith(zoneName) || hostname.endsWith(`.${zoneName}`)) {
          foundZoneId = zoneId;
          console.log(`    ✓ ${hostname} 属于 Zone ${zoneId}`);
          break;
        } else {
          console.log(`    ✗ ${hostname} 不属于此 Zone`);
        }
      }

      if (foundZoneId) {
        hostnameZoneMapping.set(hostname, foundZoneId);
        console.log(`  ✓ 找到正确的 Zone: ${foundZoneId}`);
      } else {
        console.log(`  ⚠ 无法确定 ${hostname} 属于哪个 Zone,将使用第一个 Zone`);
        hostnameZoneMapping.set(hostname, zoneIds[0]);
      }
    }

    // 6. 创建缺失的 DNS 记录 - 尝试所有 token 和 zone ID 组合
    let successCount = 0;
    let failCount = 0;

    if (missingHostnames.length > 0) {
      console.log(
        `\n步骤 6: 创建缺失的 DNS 记录 (${missingHostnames.length})...`,
      );

      for (const hostname of missingHostnames) {
        let created = false;

        // 尝试所有 token 和 zone ID 的组合
        for (
          let tokenIndex = 0;
          tokenIndex < apiTokens.length && !created;
          tokenIndex++
        ) {
          for (
            let zoneIndex = 0;
            zoneIndex < zoneIds.length && !created;
            zoneIndex++
          ) {
            const zoneId = zoneIds[zoneIndex];
            const apiToken = apiTokens[tokenIndex];

            console.log(
              `  正在创建: ${hostname} (Token #${
                tokenIndex + 1
              }, Zone: ${zoneId})`,
            );

            // 创建新的 manager 实例使用当前 token
            const tempManager = new CloudflareTunnelManager(
              apiToken,
              config.accountId,
            );

            const success = await tempManager.createDNSRecord(
              zoneId,
              hostname,
              config.tunnelId,
              true,
            );

            if (success) {
              successCount++;
              created = true;
              console.log(
                `    ✓ 创建成功 (Token #${tokenIndex + 1}, Zone: ${zoneId})`,
              );
              break;
            }
            // 失败时不打印日志，减少输出
          }
        }

        if (created) {
          console.log(`  ✓ ${hostname} - 创建成功`);
        } else {
          failCount++;
          console.log(`  ✗ ${hostname} - 所有组合都失败`);
        }
      }

      console.log(
        `\n结果: 成功 ${successCount}/${missingHostnames.length}, 失败 ${failCount}/${missingHostnames.length}`,
      );
    } else {
      console.log("\n步骤 6: ✓ 所有 DNS 记录都已存在,无需创建");
    }

    // 7. 总结
    console.log("\n" + "=".repeat(60));
    console.log("DNS 记录检查总结:");
    console.log("=".repeat(60));
    console.log(`需要检查: ${requiredHostnames.length}`);
    console.log(`已存在: ${existingDnsRecords.length}`);
    console.log(`已创建: ${missingHostnames.length}`);
    console.log("=".repeat(60));

    if (missingHostnames.length === 0) {
      console.log("\n✓ 所有 DNS 记录检查完成!");
    } else if (failCount === 0) {
      console.log("\n✓ 所有缺失的 DNS 记录已成功创建!");
    } else {
      console.log("\n⚠ 部分记录创建失败,请检查日志");
    }
  } catch (error) {
    console.error("✗ DNS 记录检查失败:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("发生错误:", error);
  process.exit(1);
});
