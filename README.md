# CloudflareTunnelManager

基于 TypeScript (ES Module) 的 Cloudflare Tunnel 配置管理工具，通过官方
Cloudflare SDK 自动化管理 Tunnel 服务路由和 DNS 记录。

## 功能特性

- 列出账户下所有 Tunnels
- 查看/添加/更新/删除单个服务 ingress 规则
- 从 JSON 配置文件批量更新服务
- 自动创建/删除 CNAME DNS 记录（指向 `<tunnelId>.cfargotunnel.com`）
- 添加/删除服务时可选同时操作 DNS
- CLI 工具 + 可编程 API
- 完整的 TypeScript 类型支持

## 安装

```bash
pnpm install
```

## 配置凭证

### 环境变量

```bash
export CLOUDFLARE_API_TOKEN="your_api_token"
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
```

也支持 `CF_API_TOKEN` / `CF_ACCOUNT_ID` 作为别名，或通过 CLI 参数 `--api-token`
/ `--account-id` 传入。

### API Token 权限

- **Account** → Cloudflare Tunnel → Edit
- **Zone** → DNS → Edit

### 获取凭证

- **API Token**:
  [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) 创建
- **Account ID**: Dashboard URL 中的
  `https://dash.cloudflare.com/<ACCOUNT_ID>/...`
- **Zone ID**: 域名 Overview 页面右侧
- **Tunnel ID**: Zero Trust → Tunnels 页面 URL 中

## CLI 使用

```bash
# 编译
pnpm build

# 开发模式（无需编译）
pnpm cli:dev <command> [options]
```

### 命令

```bash
# 列出所有 tunnels
pnpm cli list

# 查看 tunnel 配置
pnpm cli show --tunnel <tunnel_id>

# 添加服务（不创建 DNS）
pnpm cli add --tunnel <id> --hostname app.example.com --service http://localhost:3000

# 添加服务并创建 DNS 记录
pnpm cli add --tunnel <id> --zone <zone_id> \
  --hostname app.example.com --service http://localhost:3000

# 删除服务（不删除 DNS）
pnpm cli remove --tunnel <id> --hostname app.example.com

# 删除服务并删除 DNS 记录
pnpm cli remove --tunnel <id> --zone <zone_id> --hostname app.example.com

# 从配置文件批量更新
pnpm cli batch --tunnel <id> --config services.json

# 批量更新并同步 DNS
pnpm cli batch --tunnel <id> --zone <zone_id> --config services.json

# 单独操作 DNS
pnpm cli dns-add --zone <zone_id> --hostname app.example.com --tunnel <id>
pnpm cli dns-remove --zone <zone_id> --hostname app.example.com
```

### 可选参数

- `--path <pattern>` — 路径匹配模式
- `--http-host-header <header>` — 自定义 HTTP Host Header
- `--no-tls-verify <bool>` — 禁用 TLS 验证

## 编程 API

```typescript
import { CloudflareTunnelManager } from "./src/tunnel-manager.js";

const manager = new CloudflareTunnelManager(apiToken, accountId);

// 列出 tunnels
await manager.listTunnels();

// 获取 tunnel 配置
const config = await manager.getTunnelConfig(tunnelId);

// 添加/更新服务
await manager.addOrUpdateService(tunnelId, {
  hostname: "app.example.com",
  service: "http://localhost:3000",
  httpHostHeader: "app.example.com",
});

// 添加服务并创建 DNS
await manager.addServiceWithDNS(tunnelId, zoneId, {
  hostname: "app.example.com",
  service: "http://localhost:3000",
});

// 批量更新
await manager.batchUpdateServices(tunnelId, [
  { hostname: "app1.example.com", service: "http://localhost:3001" },
  { hostname: "app2.example.com", service: "http://localhost:3002" },
]);

// 删除服务
await manager.removeService(tunnelId, "app.example.com");
await manager.removeServiceWithDNS(tunnelId, zoneId, "app.example.com");

// DNS 操作
await manager.createDNSRecord(zoneId, "app.example.com", tunnelId);
await manager.deleteDNSRecord(zoneId, "app.example.com");
```

## 配置文件格式

用于 `batch` 命令和独立脚本的 JSON 配置文件：

```json
{
  "apiToken": "your_cloudflare_api_token",
  "accountId": "your_account_id",
  "zoneId": "your_zone_id",
  "tunnelId": "your_tunnel_id",
  "services": [
    {
      "hostname": "app.example.com",
      "service": "http://127.0.0.1:3000",
      "httpHostHeader": "app.example.com"
    },
    {
      "hostname": "webdav.example.com",
      "service": "http://localhost:7443",
      "noTLSVerify": true
    }
  ]
}
```

## 独立脚本

### sync-config.ts — 配置同步

将本地 JSON 配置同步到 Cloudflare 云端，对比差异后批量更新：

```bash
npx tsx sync-config.ts [config-path]
```

### check-dns.ts — DNS 记录检查

检查配置中的服务是否有对应 DNS 记录，自动创建缺失的 CNAME 记录：

```bash
npx tsx check-dns.ts
```

## 可用脚本

| 命令                 | 说明                               |
| -------------------- | ---------------------------------- |
| `pnpm build`         | 编译 TypeScript（输出到 `dist/`）  |
| `pnpm check`         | 类型检查（不输出文件）             |
| `pnpm cli <cmd>`     | 运行编译后的 CLI                   |
| `pnpm cli:dev <cmd>` | 开发模式运行 CLI（ts-node loader） |
| `pnpm format`        | Prettier 格式化                    |

## 技术说明

- ES Module 模式（`"type": "module"`），import 使用 `.js` 扩展名
- 使用官方 `cloudflare` SDK v5 调用 API
- Tunnel ingress 规则必须以 catch-all `{ service: "http_status:404" }`
  结尾，`addOrUpdateService` 会自动在 catch-all 前插入新规则
- `createDNSRecord` 对"记录已存在"错误（code 81053）做容错处理

## 许可证

ISC
