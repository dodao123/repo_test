# Week 1 — Azure Front Door Configuration

## Endpoint
- https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net

## Origin
- 4.144.193.135
- Port: 80
- Host header: 4.144.193.135
- Health probe: /health

## Route
- Pattern: /*
- Redirect: HTTPS only
- Forwarding protocol: HTTP only
