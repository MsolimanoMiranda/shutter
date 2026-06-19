# COUNTER_STRYKE

Juego web multijugador inspirado en Counter-Strike 1.6. Un servidor, un mapa (DE_DUST2), dos equipos (Terroristas vs Counter-Terroristas), máximo 10 jugadores.

## Stack

| Capa | Tecnología |
|------|-----------|
| Servidor de juego | Node.js + Express + Socket.io |
| Cliente | HTML/CSS/JS + Three.js |
| Hosting frontend | AWS Amplify |
| Hosting servidor | AWS App Runner (recomendado) |

## Inicio rápido (local)

```bash
# Instalar dependencias
npm run install:all

# Iniciar servidor + cliente
npm run dev
```

- **Cliente:** http://localhost:3000
- **Servidor:** http://localhost:3001
- **Health check:** http://localhost:3001/health

Abre varias pestañas del navegador para probar multijugador.

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

## Despliegue en AWS

### Arquitectura

```
[Amplify] ── frontend estático (client/)
     │
     └── WebSocket ──► [App Runner] ── Node.js + Socket.io (server/)
```

> **Importante:** Amplify hospeda el frontend estático. El servidor de juego con WebSockets debe desplegarse por separado (App Runner, ECS o EC2).

### 1. Desplegar el servidor (App Runner)

```bash
cd server

# Construir y subir imagen a ECR, luego crear servicio App Runner
docker build -t counter-stryke-server .
```

Configura en App Runner:
- **Puerto:** 3001
- **Variable de entorno:** `CORS_ORIGIN=https://tu-dominio.amplifyapp.com`

### 2. Desplegar el frontend (Amplify)

1. Conecta este repositorio en [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Amplify detectará `amplify.yml` automáticamente
3. Agrega variable de entorno en Amplify:

```
GAME_SERVER_URL = https://tu-servidor.apprunner.aws
```

4. En `client/index.html`, agrega antes de los scripts:

```html
<script src="env.js"></script>
```

### 3. Verificar

- Abre tu URL de Amplify
- El menú debe mostrar **SERVER STATUS: ONLINE**
- Abre otra pestaña/incógnito para unirse como segundo jugador

## Estructura del proyecto

```
counter-stryke/
├── amplify.yml          # Config Amplify (frontend)
├── client/              # Frontend estático
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── game/        # Three.js renderer, mapa, controles
│       ├── screens/     # Menú, equipos, juego
│       └── network/     # Socket.io client
└── server/              # Servidor de juego
    ├── index.js
    ├── Dockerfile
    └── game/
        ├── GameServer.js
        └── Player.js
```

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
