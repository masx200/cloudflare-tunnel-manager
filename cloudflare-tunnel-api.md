```js
fetch(
  "https://dash.cloudflare.com/api/v4/accounts/************************************/cfd_tunnel/***********************************/configurations",
  {
    headers: {
      accept: "*/*",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      priority: "u=1, i",
      "sec-ch-ua":
        '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      cookie:
        "************************************************************************",
      Referer: "https://one.dash.cloudflare.com/",
    },
    body: null,
    method: "GET",
  },
);
console.log({
  success: true,
  errors: [],
  messages: [],
  result: {
    tunnel_id: "************************************",
    version: 5,
    config: {
      ingress: [
        {
          service: "http://127.0.0.1:7860",
          hostname:
            "*********************************************************************",
          originRequest: {
            httpHostHeader:
              "*********************************************************************",
          },
        },
        {
          service: "http://localhost:7443",
          hostname:
            "*********************************************************************",
          originRequest: {},
        },
        {
          service: "http://127.0.0.1:33333",
          hostname:
            "*********************************************************************",
          originRequest: {},
        },
        {
          service: "http_status:404",
        },
      ],
      "warp-routing": {
        enabled: false,
      },
    },
    source: "cloudflare",
    created_at: "2026-01-02T19:13:37.787186Z",
  },
});
console.log({
  success: true,
  errors: [],
  messages: [],
  result: {
    tunnel_id: "***********************************",
    version: 8,
    config: {
      ingress: [
        {
          service: "http://127.0.0.1:2053",
          hostname:
            "*********************************************************************",
          originRequest: {},
        },
        {
          service: "http://127.0.0.1:2096",
          hostname:
            "*********************************************************************",
          originRequest: {},
        },
        {
          service: "http://127.0.0.1:7860",
          hostname:
            "*********************************************************************",
          originRequest: {
            httpHostHeader:
              "*********************************************************************",
          },
        },
        {
          service: "http://localhost:7443",
          hostname:
            "*********************************************************************",
          originRequest: {},
        },
        {
          service: "http://127.0.0.1:33333",
          hostname:
            "*********************************************************************",
          originRequest: {},
        },
        {
          service: "http_status:404",
        },
      ],
      "warp-routing": {
        enabled: false,
      },
    },
    source: "cloudflare",
    created_at: "2026-01-08T17:25:27.147336Z",
  },
});
```
