# 通过 API 管理 Cloudflare Tunnels 所需令牌权限指南

## 概述

Cloudflare Tunnels（也称为 Cloudflared Tunnels 或 Zero Trust Tunnels）可以通过
API 进行创建、列出、更新、删除和配置管理。主要 API 端点位于
`/accounts/{account_id}/cfd_tunnel` 下，支持完整 CRUD
操作。developers.cloudflare+1

## 所需 API 令牌权限

要通过 API 管理 Tunnels，需要在 Cloudflare 仪表板创建自定义 API Token，并授予
**Account 级别** 的以下最小权限（Edit
级别支持完整管理，包括创建、读取、更新、删除和列表）：

| 权限资源                           | 权限级别 | 描述                                                                                                                                                                                  |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloudflare Tunnel**              | Edit     | 核心权限，用于管理 Tunnels（如创建 `/cfd_tunnel`<br/>、配置 `/configurations`<br/>、连接 `/connections`<br/>、Token `/token`<br/> 等）。这是管理 Tunnels 的必要权限。fnosp.dustinky+2 |
| **Zone: DNS** (可选)               | Edit     | 如果需要为 Tunnel 配置公共主机名（Public Hostname）并自动管理 DNS 记录，则添加此权限。[fnosp.dustinky](https://fnosp.dustinky.com/products/tunnel/setup/configuration)                |
| **Cloudflare Access** (可选，推荐) | Edit     | 用于高级路由、Access 集成和 `cloudflared login`<br/>，或将流量路由到公共主机名。developers.cloudflare+1                                                                               |
| **Cloudflare One Connectors**      | Write    | 对于远程管理 Tunnel 或刷新 Token 时需要。developers.cloudflare+1                                                                                                                      |

**注意**：

- **Edit** 权限提供完整 CRUDL（Create, Read, Update, Delete,
  List）访问。[developers.cloudflare](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- 范围选择 **Account**（账户级别），而非 Zone（域名级别），因为 Tunnels
  是账户资源。[developers.cloudflare](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/remote-tunnel-permissions/)
- 最小权限原则：仅授予必要权限，避免 Global API
  Key（不推荐，已弃用）。[fnosp.dustinky](https://fnosp.dustinky.com/products/tunnel/setup/configuration)

## 创建 API Token 步骤

1. 登录 [Cloudflare 仪表板](https://dash.cloudflare.com/)，进入 **My Profile >
   API Tokens**。
2. 点击 **Create Token > Create Custom Token**。
3. **Token name**：自定义，如 "Tunnel Management"。
4. **Permissions**：
   - 添加 **Account > Cloudflare Tunnel > Edit**。
   - 如需 DNS：添加 **Zone > DNS > Edit**。
5. **Account Resources**：选择具体 Account ID（或 All）。
6. **Zone Resources**：如需 DNS，选择相关 Zone 或 All。
7. **TTL**：设置过期时间（如 1 年）。
8. 点击 **Continue to summary > Create Token**，复制 Token。sites.google+2

## 示例 API 调用

使用 Token 在 `Authorization: Bearer <TOKEN>` 头中。示例（列出 Tunnels）：

```plain
text
GET https://api.cloudflare.com/client/v4/accounts/{account_id}/cfd_tunnel
Authorization: Bearer <YOUR_API_TOKEN>
```

完整端点包括：

- 创建：`POST /accounts/{account_id}/cfd_tunnel`
- 配置：`PUT /accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations`
- Token：`GET /accounts/{account_id}/cfd_tunnel/{tunnel_id}/token`
  [developers.cloudflare](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/remote-tunnel-permissions/)

## 安全建议

- **单独 Token**：为不同工具创建独立 Token，便于撤销。fnosp.dustinky+1
- **撤销**：若泄露，在 API Tokens 页面删除。
- **测试**：先用 Read 权限测试，再升级
  Edit。[reddit](https://www.reddit.com/r/CloudFlare/comments/1mvgol3/question_how_to_figure_out_what_permissions_i/)
- 参考官方文档：[Tunnels API](https://developers.cloudflare.com/api/resources/zero_trust/subresources/tunnels/)
  和
  [权限参考](https://developers.cloudflare.com/fundamentals/api/reference/permissions/).developers.cloudflare+1

此配置确保安全、高效管理 Tunnels。fnosp.dustinky+1
