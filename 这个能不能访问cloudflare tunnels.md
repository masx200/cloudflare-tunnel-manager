**当然可以。这个 SDK 完整支持 Cloudflare Tunnels。**

Tunnels 功能位于 Zero Trust 模块下，通过 `client.zeroTrust.tunnels`
访问。它支持两种隧道类型：

**1. Cloudflared 隧道** - 传统隧道

- 创建、编辑、删除、获取、列表
- 管理配置、连接、令牌

**2. WARP Connector 隧道** - 新型隧道

- 同样支持完整的 CRUD 操作

使用示例：

```typescript
import Cloudflare from "cloudflare";

const client = new Cloudflare({
  apiToken: "your-api-token",
});

// 列出账户下的所有隧道
const tunnels = await client.zeroTrust.tunnels.list({
  account_id: "your-account-id",
});

// 创建新的 Cloudflared 隧道
const tunnel = await client.zeroTrust.tunnels.cloudflared.create({
  account_id: "your-account-id",
  name: "my-tunnel",
});
```

具体实现位于
[src/resources/zero-trust/tunnels](src/resources/zero-trust/tunnels)，包括完整的类型定义和分页支持。

想要了解更多？ [发出你的首个 API 请求](5-making-your-first-api-request)
[高级资源操作](13-advanced-resource-operations)
