# Cloudflare Tunnel 配置管理工具

一个功能完整的 Node.js/TypeScript 工具,用于自动化管理 Cloudflare Tunnels 配置和
DNS 记录。

**项目使用 ES Module (`"type": "module`)**

## 功能特性

- ✅ 列出账户下所有 Tunnels
- ✅ 查看 Tunnel 详细配置
- ✅ 添加/更新/删除单个服务
- ✅ 批量更新服务配置
- ✅ 自动创建/删除 DNS 记录
- ✅ 完整的 TypeScript 类型支持
- ✅ 命令行 CLI 工具
- ✅ 可编程 API
- ✅ ES Module 支持

## 安装依赖

```bash
# 使用 pnpm(推荐)
pnpm install

# 或使用 npm
npm install

# 或使用 yarn
yarn install
```

## 配置

### 1. 获取必要的凭证

你需要以下信息:

- **API Token**: 在
  [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) 创建
  - 需要权限: `Account - Cloudflare Tunnel - Edit` 和 `Zone - DNS - Edit`

- **Account ID**: 在 Dashboard 的 URL 中可以看到
  - URL 格式: `https://dash.cloudflare.com/<ACCOUNT_ID>/...`

- **Zone ID**: 在域名的 Overview 页面右侧可以找到

- **Tunnel ID**: 在 Zero Trust > Tunnels 页面的 URL 中可以看到

### 2. 设置环境变量

```bash
# Linux/macOS
export CLOUDFLARE_API_TOKEN="your_api_token"
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
export CLOUDFLARE_ZONE_ID="your_zone_id"
export CLOUDFLARE_TUNNEL_ID="your_tunnel_id"

# Windows PowerShell
$env:CLOUDFLARE_API_TOKEN="your_api_token"
$env:CLOUDFLARE_ACCOUNT_ID="your_account_id"
$env:CLOUDFLARE_ZONE_ID="your_zone_id"
$env:CLOUDFLARE_TUNNEL_ID="your_tunnel_id"

# Windows CMD
set CLOUDFLARE_API_TOKEN=your_api_token
set CLOUDFLARE_ACCOUNT_ID=your_account_id
set CLOUDFLARE_ZONE_ID=your_zone_id
set CLOUDFLARE_TUNNEL_ID=your_tunnel_id
```

### 3. 创建配置文件

复制 [services.example.json](services.example.json) 并修改:

```bash
cp services.example.json services.json
```

编辑 `services.json`:

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
      "hostname": "api.example.com",
      "service": "http://127.0.0.1:8000",
      "path": "/api/*"
    },
    {
      "hostname": "webdav.example.com",
      "service": "http://localhost:7443",
      "noTLSVerify": true
    }
  ]
}
```

## 使用方法

### 方法 1: 使用 CLI 工具

```bash
# 编译 TypeScript
pnpm build

# 列出所有 tunnels
pnpm cli list

# 显示 tunnel 配置
pnpm cli show --tunnel <tunnel_id>

# 添加单个服务(不创建 DNS)
pnpm cli add \
  --tunnel <tunnel_id> \
  --hostname app.example.com \
  --service http://localhost:3000

# 添加服务并自动创建 DNS 记录
pnpm cli add \
  --tunnel <tunnel_id> \
  --zone <zone_id> \
  --hostname app.example.com \
  --service http://localhost:3000 \
  --http-host-header app.example.com

# 删除服务(不删除 DNS)
pnpm cli remove \
  --tunnel <tunnel_id> \
  --hostname app.example.com

# 删除服务并自动删除 DNS 记录
pnpm cli remove \
  --tunnel <tunnel_id> \
  --zone <zone_id> \
  --hostname app.example.com

# 批量更新(从配置文件)
pnpm cli batch \
  --tunnel <tunnel_id> \
  --config services.json

# 批量更新并同步 DNS
pnpm cli batch \
  --tunnel <tunnel_id> \
  --zone <zone_id> \
  --config services.json

# 单独添加 DNS 记录
pnpm cli dns-add \
  --zone <zone_id> \
  --hostname app.example.com \
  --tunnel <tunnel_id>

# 单独删除 DNS 记录
pnpm cli dns-remove \
  --zone <zone_id> \
  --hostname app.example.com
```

### 方法 2: 使用开发模式(无需编译)

```bash
# 使用 ts-node loader 直接运行 TypeScript
pnpm cli:dev list
pnpm cli:dev show --tunnel <tunnel_id>
pnpm cli:dev add --tunnel <id> --hostname app.example.com --service http://localhost:3000
```

### 方法 3: 在代码中使用(ES Module)

```typescript
import { CloudflareTunnelManager } from "./src/tunnel-manager.js";

const manager = new CloudflareTunnelManager(
  "your_api_token",
  "your_account_id",
);

// 列出所有 tunnels
await manager.listTunnels();

// 添加服务
await manager.addOrUpdateService("tunnel_id", {
  hostname: "app.example.com",
  service: "http://localhost:3000",
  httpHostHeader: "app.example.com",
});

// 添加服务并创建 DNS
await manager.addServiceWithDNS("tunnel_id", "zone_id", {
  hostname: "app.example.com",
  service: "http://localhost:3000",
  httpHostHeader: "app.example.com",
});

// 批量更新
await manager.batchUpdateServices("tunnel_id", [
  {
    hostname: "app1.example.com",
    service: "http://localhost:3001",
  },
  {
    hostname: "app2.example.com",
    service: "http://localhost:3002",
  },
]);

// 删除服务
await manager.removeService("tunnel_id", "app.example.com");
await manager.removeServiceWithDNS("tunnel_id", "zone_id", "app.example.com");
```

### 方法 4: 运行示例脚本

```bash
# 使用 pnpm example 命令
pnpm example list
pnpm example show
pnpm example add
pnpm example batch
```

## API 参考

### CloudflareTunnelManager 类

#### 构造函数

```typescript
constructor(apiToken: string, accountId: string)
```

#### 方法

##### listTunnels()

列出账户下所有 tunnels

```typescript
await manager.listTunnels();
```

##### getTunnelConfig(tunnelId: string)

获取指定 tunnel 的当前配置

```typescript
const config = await manager.getTunnelConfig(tunnelId);
```

##### showTunnelDetails(tunnelId: string)

显示 tunnel 的详细配置

```typescript
await manager.showTunnelDetails(tunnelId);
```

##### addOrUpdateService(tunnelId: string, serviceConfig: ServiceConfig)

添加或更新单个服务

```typescript
await manager.addOrUpdateService(tunnelId, {
  hostname: "app.example.com",
  service: "http://localhost:3000",
  httpHostHeader: "app.example.com",
  noTLSVerify: false,
});
```

##### removeService(tunnelId: string, hostname: string)

删除指定 hostname 的服务

```typescript
await manager.removeService(tunnelId, "app.example.com");
```

##### batchUpdateServices(tunnelId: string, services: ServiceConfig[])

批量更新服务配置

```typescript
await manager.batchUpdateServices(tunnelId, [
  { hostname: "app1.example.com", service: "http://localhost:3001" },
  { hostname: "app2.example.com", service: "http://localhost:3002" },
]);
```

##### createDNSRecord(zoneId: string, hostname: string, tunnelId: string, proxied?: boolean)

创建 DNS 记录

```typescript
await manager.createDNSRecord(zoneId, hostname, tunnelId, true);
```

##### deleteDNSRecord(zoneId: string, recordName: string)

删除 DNS 记录

```typescript
await manager.deleteDNSRecord(zoneId, "app.example.com");
```

##### addServiceWithDNS(tunnelId: string, zoneId: string, serviceConfig: ServiceConfig)

完整添加服务流程(包括 DNS 记录)

```typescript
await manager.addServiceWithDNS(tunnelId, zoneId, {
  hostname: "app.example.com",
  service: "http://localhost:3000",
});
```

##### removeServiceWithDNS(tunnelId: string, zoneId: string, hostname: string)

完整删除服务流程(包括 DNS 记录)

```typescript
await manager.removeServiceWithDNS(tunnelId, zoneId, "app.example.com");
```

## 配置格式

### ServiceConfig 接口

```typescript
interface ServiceConfig {
  hostname: string; // 必需: 主机名
  service: string; // 必需: 后端服务 URL
  path?: string; // 可选: 路径匹配模式
  httpHostHeader?: string; // 可选: HTTP Host Header
  noTLSVerify?: boolean; // 可选: 是否禁用 TLS 验证
}
```

### TunnelConfig 接口

```typescript
interface TunnelConfig {
  ingress: IngressRule[];
  "warp-routing"?: {
    enabled: boolean;
  };
}
```

## 实用场景

### 场景 1: 快速添加新服务

```bash
pnpm cli:dev add \
  --tunnel $TUNNEL_ID \
  --zone $ZONE_ID \
  --hostname new-service.example.com \
  --service http://localhost:4000
```

### 场景 2: 从配置文件批量部署

```bash
# 1. 编辑配置文件
vim services.json

# 2. 批量更新
pnpm cli:dev batch \
  --tunnel $TUNNEL_ID \
  --zone $ZONE_ID \
  --config services.json
```

### 场景 3: 在 CI/CD 中使用

```yaml
# .github/workflows/deploy.yml
name: Deploy Tunnel Services

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "pnpm"
      - name: Install dependencies
        run: pnpm install
      - name: Build
        run: pnpm build
      - name: Update tunnel config
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_ZONE_ID: ${{ secrets.CLOUDFLARE_ZONE_ID }}
          CLOUDFLARE_TUNNEL_ID: ${{ secrets.CLOUDFLARE_TUNNEL_ID }}
        run: |
          pnpm cli batch \
            --tunnel $CLOUDFLARE_TUNNEL_ID \
            --zone $CLOUDFLARE_ZONE_ID \
            --config services.json
```

### 场景 4: 同步现有配置到 DNS

```typescript
import { CloudflareTunnelManager } from "./src/tunnel-manager.js";

async function syncDNS() {
  const manager = new CloudflareTunnelManager(API_TOKEN, ACCOUNT_ID);

  const config = await manager.getTunnelConfig(TUNNEL_ID);
  if (!config) return;

  for (const rule of config.ingress) {
    if (rule.hostname) {
      await manager.createDNSRecord(ZONE_ID, rule.hostname, TUNNEL_ID);
    }
  }
}
```

## 编译和构建

```bash
# 编译 TypeScript
pnpm run build

# 或直接使用 tsc
npx tsc

# 编译后的文件在 dist/ 目录
```

## ES Module 说明

本项目使用 ES Module 模式:

- [package.json](package.json:4) 中设置了 `"type": "module"`
- 使用 `.js` 扩展名进行 import (例如:
  `import { CloudflareTunnelManager } from "./tunnel-manager.js"`)
- 使用 `import.meta.url` 替代 `require.main`
- 使用 `node --loader ts-node/esm` 运行 TypeScript 文件

## 可用脚本

```bash
# 编译 TypeScript
pnpm build

# 运行编译后的 CLI
pnpm cli [命令] [选项]

# 开发模式(无需编译)
pnpm cli:dev [命令] [选项]

# 运行示例
pnpm example [示例名]

# 代码格式化
pnpm format
```

## 故障排除

### 问题: API Token 权限不足

确保你的 API Token 具有以下权限:

- Account - Cloudflare Tunnel - Edit
- Zone - DNS - Edit

### 问题: 找不到 Account ID

访问 Cloudflare Dashboard,在 URL 中可以看到:
`https://dash.cloudflare.com/<ACCOUNT_ID>/...`

### 问题: Tunnel 配置更新不生效

1. 检查是否使用了正确的 tunnel_id
2. 确认 tunnel 状态是否为 "active"
3. 查看 cloudflared 日志确认配置已同步

### 问题: ES Module 导入错误

确保:

- 所有 import 语句使用 `.js` 扩展名
- package.json 中有 `"type": "module"`
- 使用 `pnpm cli:dev` 而不是 `ts-node` 直接运行

## 相关文档

- [Cloudflare Tunnel API 文档](https://developers.cloudflare.com/api/tunnel/)
- [要通过 API 修改云端配置.md](要通过%20API%20修改云端配置，需要使用%20Cloudflare%20API.md)
- [cloudflare-tunnel-api.md](cloudflare-tunnel-api.md)

## 许可证

ISC
