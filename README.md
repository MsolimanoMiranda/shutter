# COUNTER_STRYKE

Juego web multijugador inspirado en Counter-Strike 1.6. Un servidor, un mapa (DE_DUST2), dos equipos (Terroristas vs Counter-Terroristas), máximo 10 jugadores.

## Stack

| Capa | Tecnología |
|------|-----------|
| Servidor de juego | Node.js + Express + Socket.io |
| Cliente | HTML/CSS/JS + Three.js |
| Producción | VPS (un solo proceso: web + juego) |

## Inicio rápido (local)

```bash
npm run install:all
npm run dev
```

- **Desarrollo:** cliente en http://localhost:3000 y servidor en http://localhost:3001
- **Producción / VPS:** todo en un solo puerto → http://tu-servidor:3001
- **Health check:** `/health`

Abre varias pestañas del navegador para probar multijugador.

## Despliegue en VPS (recomendado)

Un solo servicio sirve el juego **y** el cliente. No necesitas Amplify ni dos servidores.

```
Internet → Nginx (80/443) → Node.js :3001
                              ├── client/  (HTML, JS, assets)
                              └── Socket.io (multijugador)
```

### 1. Subir el proyecto al VPS

```bash
# En tu máquina
git clone <tu-repo> counter-stryke
# o: scp -r ./retro usuario@TU_IP:/opt/counter-stryke
```

### 2. Instalar en el VPS

```bash
ssh usuario@TU_IP
cd /opt/counter-stryke   # o la ruta donde subiste el proyecto

npm run vps:install
```

Requisitos: **Node.js 20+**, puerto **3001** abierto en el firewall.

### 3. Arrancar el juego

**Opción A — Prueba rápida**

```bash
npm run start:prod
# Abre http://TU_IP:3001
```

**Opción B — PM2 (recomendado)**

```bash
npm install -g pm2
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup   # sigue las instrucciones para auto-arranque
```

**Opción C — Docker**

```bash
docker compose up -d --build
```

### 4. Nginx + dominio + HTTPS (producción)

```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/counter-stryke
# Edita server_name con tu dominio
sudo ln -s /etc/nginx/sites-available/counter-stryke /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tu-dominio.com
```

Abre **https://tu-dominio.com** — el cliente detecta el servidor automáticamente (mismo origen).

### 5. Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # si usas nginx
# o solo el puerto directo:
# sudo ufw allow 3001/tcp
sudo ufw enable
```

### Variables de entorno

Copia `.env.example` a `.env` si quieres personalizar:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3001` | Puerto del servidor |
| `CORS_ORIGIN` | `*` | Origen CORS (con mismo dominio no importa mucho) |
| `TRUST_PROXY` | `1` | Activo detrás de nginx |
| `NODE_ENV` | `production` | Modo producción |

### Verificar

- `curl http://localhost:3001/health` → `{"status":"ok",...}`
- Abre la URL en el navegador → **SERVER STATUS: ONLINE**
- Segunda pestaña/incógnito → segundo jugador

---

## Despliegue AWS (opcional, 2 servicios)

Si prefieres Amplify + App Runner en lugar de un VPS, el frontend y el servidor van separados. Ver `amplify.yml` y desplegar `server/` con Docker en App Runner. Para la mayoría de casos, **VPS es más simple**.

## Estructura del proyecto

```
counter-stryke/
├── Dockerfile           # Imagen Docker (client + server)
├── docker-compose.yml
├── deploy/
│   ├── ecosystem.config.cjs   # PM2
│   ├── nginx.conf.example
│   └── install-vps.sh
├── client/              # Frontend (servido por Express en producción)
└── server/              # Node.js + Socket.io
    ├── index.js
    └── game/
```

## Controles

| Tecla | Acción |
|-------|--------|
| WASD | Movimiento (A = derecha, D = izquierda) |
| Espacio | Saltar |
| Mouse | Mirar |
| Click izquierdo | Disparar |
| R | Recargar |
| 4 (mantener) | Plantar bomba (T, en zona A/B) |
| 5 (mantener) | Desactivar bomba (CT) |
| Y | Chat de equipo |
| U | Chat global |
| B | Cerrar menú de compra |

## Flujo del juego

1. **Menú** — Ingresa tu nombre y conéctate al servidor
2. **Selección de equipo** — Terroristas (naranja) o Counter-Terroristas (verde), máx. 5 por lado
3. **Fase de compra** — 15 segundos para comprar armas y equipo
4. **Combate** — Rondas de 115 segundos, primer equipo a 16 victorias gana

## API

| Endpoint / Evento | Descripción |
|-------------------|-------------|
| `GET /health` | Estado del servidor |
| `GET /api/status` | Estado completo del juego |
| `join` | Unirse al servidor |
| `selectTeam` | Elegir equipo |
| `startMatch` | Iniciar partida |
| `buy` | Comprar arma/equipo |
| `move` | Actualizar posición |
| `shoot` | Disparar |

## Próximos pasos sugeridos

- [x] Colisiones con paredes del mapa
- [x] Sistema de bomba (plant/defuse)
- [x] Chat de equipo y global
- [ ] Modelos 3D de armas en primera persona
- [ ] Sonidos y efectos
