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
