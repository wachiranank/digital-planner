# Extra sites on the same VPS

The Caddy in this kit owns ports 80/443. To publish another app that runs on the same VPS:

1. Attach that app's container to the shared `edge` network (e.g. in its `compose.override.yaml`):
   ```yaml
   services:
     app:
       ports: !reset []
       networks:
         default:
         edge:
           aliases: [myapp]
   networks:
     edge:
       name: edge
       external: true
   ```
2. Add a file here, e.g. `myapp.caddy`:
   ```
   myapp.example.com {
       reverse_proxy myapp:80
   }
   ```
3. `docker compose restart caddy`

## n8n (VPS template "Ubuntu 24.04 with n8n")

`n8n.caddy` + `../scripts/n8n-connect.sh n8n.claudecoach.online` move the template's n8n behind this Caddy
(backs up data first, joins `edge` as `n8n`, sets N8N_HOST / WEBHOOK_URL, disables the template's Traefik).
