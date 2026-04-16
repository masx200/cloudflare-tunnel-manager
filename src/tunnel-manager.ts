import Cloudflare from "cloudflare";

interface IngressRule {
  hostname?: string;
  service: string;
  path?: string;
  originRequest?: {
    httpHostHeader?: string;
    noTLSVerify?: boolean;
    connectTimeout?: number;
    tlsTimeout?: number;
    tcpKeepAlive?: number;
    keepAliveConnections?: number;
    keepAliveTimeout?: number;
  };
}

interface TunnelConfig {
  ingress: IngressRule[];
  "warp-routing"?: {
    enabled: boolean;
  };
}

interface ServiceConfig {
  hostname: string;
  service: string;
  path?: string;
  httpHostHeader?: string;
  noTLSVerify?: boolean;
}

export class CloudflareTunnelManager {
  private client: Cloudflare;
  private accountId: string;

  constructor(apiToken: string, accountId: string) {
    this.client = new Cloudflare({
      apiToken,
    });
    this.accountId = accountId;
  }

  /**
   * 获取指定 tunnel 的当前配置
   */
  async getTunnelConfig(tunnelId: string): Promise<TunnelConfig | null> {
    try {
      const response = await this.client.zeroTrust.tunnels.cloudflared
        .configurations.get(
          tunnelId,
          {
            account_id: this.accountId,
          },
        );

      return response.config as unknown as TunnelConfig;
    } catch (error) {
      console.error("获取隧道配置失败:", error);
      return null;
    }
  }

  /**
   * 更新 tunnel 配置
   */
  async updateTunnelConfig(
    tunnelId: string,
    config: TunnelConfig,
  ): Promise<boolean> {
    try {
      await this.client.zeroTrust.tunnels.cloudflared.configurations.update(
        tunnelId,
        {
          account_id: this.accountId,
          config: config as unknown as {
            ingress: Array<{
              hostname: string;
              service: string;
              path?: string;
              originRequest?: any;
            }>;
          },
        },
      );

      console.log(`隧道 ${tunnelId} 配置更新成功`);
      return true;
    } catch (error) {
      console.error("更新隧道配置失败:", error);
      return false;
    }
  }

  /**
   * 添加或更新单个服务到 tunnel
   */
  async addOrUpdateService(
    tunnelId: string,
    serviceConfig: ServiceConfig,
  ): Promise<boolean> {
    const currentConfig = await this.getTunnelConfig(tunnelId);
    if (!currentConfig) {
      console.error("无法获取当前配置");
      return false;
    }

    // 确保 ingress 数组存在
    if (!currentConfig.ingress) {
      currentConfig.ingress = [];
    }

    // 查找是否已存在相同 hostname 的规则
    const existingIndex = currentConfig.ingress.findIndex(
      (rule) => rule.hostname === serviceConfig.hostname,
    );

    const newRule: IngressRule = {
      hostname: serviceConfig.hostname,
      service: serviceConfig.service,
      path: serviceConfig.path,
      originRequest: {
        ...(serviceConfig.httpHostHeader && {
          httpHostHeader: serviceConfig.httpHostHeader,
        }),
        ...(serviceConfig.noTLSVerify !== undefined && {
          noTLSVerify: serviceConfig.noTLSVerify,
        }),
      },
    };

    if (existingIndex >= 0) {
      // 更新现有规则
      currentConfig.ingress[existingIndex] = newRule;
      console.log(`更新服务: ${serviceConfig.hostname}`);
    } else {
      // 在 catch-all 规则之前插入新规则
      const catchAllIndex = currentConfig.ingress.findIndex(
        (rule) => rule.service === "http_status:404",
      );

      if (catchAllIndex >= 0) {
        currentConfig.ingress.splice(catchAllIndex, 0, newRule);
      } else {
        currentConfig.ingress.push(newRule);
      }
      console.log(`添加服务: ${serviceConfig.hostname}`);
    }

    return await this.updateTunnelConfig(tunnelId, currentConfig);
  }

  /**
   * 删除指定 hostname 的服务
   */
  async removeService(tunnelId: string, hostname: string): Promise<boolean> {
    const currentConfig = await this.getTunnelConfig(tunnelId);
    if (!currentConfig) {
      console.error("无法获取当前配置");
      return false;
    }

    const initialLength = currentConfig.ingress.length;
    currentConfig.ingress = currentConfig.ingress.filter(
      (rule) =>
        rule.hostname !== hostname && rule.service !== "http_status:404",
    );

    // 添加回 catch-all 规则
    currentConfig.ingress.push({ service: "http_status:404" });

    if (currentConfig.ingress.length < initialLength) {
      console.log(`删除服务: ${hostname}`);
      return await this.updateTunnelConfig(tunnelId, currentConfig);
    } else {
      console.log(`未找到服务: ${hostname}`);
      return false;
    }
  }

  /**
   * 批量更新服务配置
   */
  async batchUpdateServices(
    tunnelId: string,
    services: ServiceConfig[],
  ): Promise<boolean> {
    const ingressRules: IngressRule[] = services.map((service) => ({
      hostname: service.hostname,
      service: service.service,
      path: service.path,
      originRequest: {
        ...(service.httpHostHeader && {
          httpHostHeader: service.httpHostHeader,
        }),
        ...(service.noTLSVerify !== undefined && {
          noTLSVerify: service.noTLSVerify,
        }),
      },
    }));

    // 添加 catch-all 规则
    ingressRules.push({ service: "http_status:404" });

    const config: TunnelConfig = {
      ingress: ingressRules,
    };

    return await this.updateTunnelConfig(tunnelId, config);
  }

  /**
   * 创建 DNS 记录
   */
  async createDNSRecord(
    zoneId: string,
    hostname: string,
    tunnelId: string,
    proxied: boolean = true,
  ): Promise<boolean> {
    try {
      await this.client.dns.records.create({
        zone_id: zoneId,
        type: "CNAME",
        name: hostname,
        content: `${tunnelId}.cfargotunnel.com`,
        ttl: 1,
        proxied,
      });

      console.log(`DNS 记录创建成功: ${hostname}`);
      return true;
    } catch (error: any) {
      // 检查是否是"记录已存在"的错误
      if (error.errors && error.errors.some((e: any) => e.code === 81053)) {
        console.log(`DNS 记录已存在: ${hostname}`);
        return true; // 记录已存在视为成功
      }
      console.error(`DNS 记录创建失败 ${hostname}:`, error);
      return false;
    }
  }

  /**
   * 删除 DNS 记录
   */
  async deleteDNSRecord(zoneId: string, recordName: string): Promise<boolean> {
    try {
      // 先查找记录
      const records = await this.client.dns.records.list({
        zone_id: zoneId,
        name: { exact: recordName },
      });

      if (records.result.length === 0) {
        console.log(`未找到 DNS 记录: ${recordName}`);
        return false;
      }

      // 删除找到的记录
      for (const record of records.result) {
        await this.client.dns.records.delete(record.id, {
          zone_id: zoneId,
        });
        console.log(`DNS 记录删除成功: ${recordName}`);
      }

      return true;
    } catch (error) {
      console.error(`DNS 记录删除失败 ${recordName}:`, error);
      return false;
    }
  }

  /**
   * 列出所有 tunnels
   */
  async listTunnels(): Promise<void> {
    try {
      const tunnels = await this.client.zeroTrust.tunnels.list({
        account_id: this.accountId,
      });

      console.log("\n当前账户的 Tunnels:");
      console.log("=".repeat(60));
      for (const tunnel of tunnels.result) {
        console.log(`ID: ${tunnel.id}`);
        console.log(`名称: ${tunnel.name}`);
        console.log(`状态: ${tunnel.status}`);
        console.log("-".repeat(60));
      }
    } catch (error) {
      console.error("获取 tunnel 列表失败:", error);
    }
  }

  /**
   * 显示 tunnel 的详细配置
   */
  async showTunnelDetails(tunnelId: string): Promise<void> {
    const config = await this.getTunnelConfig(tunnelId);
    if (!config) {
      console.log("无法获取 tunnel 配置");
      return;
    }

    console.log(`\nTunnel ${tunnelId} 的配置:`);
    console.log("=".repeat(60));
    console.log(JSON.stringify(config, null, 2));
    console.log("=".repeat(60));
  }

  /**
   * 完整的添加服务流程(包括 DNS 记录)
   */
  async addServiceWithDNS(
    tunnelId: string,
    zoneId: string,
    serviceConfig: ServiceConfig,
  ): Promise<boolean> {
    // 1. 添加到 tunnel 配置
    const tunnelUpdated = await this.addOrUpdateService(
      tunnelId,
      serviceConfig,
    );
    if (!tunnelUpdated) {
      console.error("更新 tunnel 配置失败");
      return false;
    }

    // 2. 创建 DNS 记录
    const dnsCreated = await this.createDNSRecord(
      zoneId,
      serviceConfig.hostname,
      tunnelId,
      true,
    );
    if (!dnsCreated) {
      console.warn("DNS 记录创建失败,但 tunnel 配置已更新");
      return true;
    }

    console.log(`\n成功添加服务: ${serviceConfig.hostname}`);
    return true;
  }

  /**
   * 完整的删除服务流程(包括 DNS 记录)
   */
  async removeServiceWithDNS(
    tunnelId: string,
    zoneId: string,
    hostname: string,
  ): Promise<boolean> {
    // 1. 从 tunnel 配置中删除
    const tunnelUpdated = await this.removeService(tunnelId, hostname);
    if (!tunnelUpdated) {
      console.error("更新 tunnel 配置失败");
      return false;
    }

    // 2. 删除 DNS 记录
    const dnsDeleted = await this.deleteDNSRecord(zoneId, hostname);
    if (!dnsDeleted) {
      console.warn("DNS 记录删除失败,但 tunnel 配置已更新");
      return true;
    }

    console.log(`\n成功删除服务: ${hostname}`);
    return true;
  }
}
