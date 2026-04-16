## 直接回答

要通过 API 修改云端配置，需要使用 **Cloudflare API**，而不是 cloudflared
的内置客户端。cloudflared 的 `cfapi` 包只提供了基础的隧道管理功能，不包括修改
Ingress 配置。

---

## 详细说明

### API 端点

修改隧道配置的 Cloudflare API 端点：

```
PATCH https://api.cloudflare.com/client/v4/accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations
```

### 请求示例

```bash
curl -X PATCH "https://api.cloudflare.com/client/v4/accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "ingress": [
        {
          "hostname": "example.com",
          "service": "http://localhost:8080"
        },
        {
          "service": "http_status:404"
        }
      ]
    }
  }'
```

### 完整配置格式

```json
{
  "config": {
    "warp-routing": {
      "enabled": true
    },
    "originRequest": {
      "connectTimeout": 30,
      "tlsTimeout": 10,
      "tcpKeepAlive": 30,
      "keepAliveConnections": 100,
      "keepAliveTimeout": 90
    },
    "ingress": [
      {
        "hostname": "www.example.com",
        "service": "https://localhost:8000",
        "originRequest": {
          "noTLSVerify": true,
          "httpHostHeader": "example.com"
        }
      },
      {
        "hostname": "*.example.xyz",
        "path": "/[a-zA-Z]+.html",
        "service": "https://localhost:8001"
      },
      {
        "service": "http_status:404"
      }
    ]
  }
}
```

### 获取当前配置

```bash
curl -X GET "https://api.cloudflare.com/client/v4/accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations" \
  -H "Authorization: Bearer {api_token}"
```

### cloudflared 代码库的局限

从代码来看：

- [TunnelClient 接口](cfapi/client.go#L7-L16) 只包含基础隧道操作
- [RouteTunnel](cfapi/hostname.go#L178) 只能添加 DNS/LB 路由，不能修改完整配置
- [RemoteConfig](ingress/config.go#L86-L91)
  是从云端**读取**配置的结构，没有写入方法

### API Token 权限

创建 API Token 时需要以下权限：

- Account - Cloudflare Tunnel - Edit
- Zone - DNS - Edit（如果需要创建 DNS 记录）

---

## 下一步建议

[配置基础](5-configuration-basics) - 理解配置文件结构\
[入站规则](12-ingress-rules) - 了解 Ingress 规则的配置细节\
[Cloudflare API 文档](https://developers.cloudflare.com/api/tunnel/) - 官方 API
参考文档
