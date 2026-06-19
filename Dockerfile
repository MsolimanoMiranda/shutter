FROM node:20-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json* server/.npmrc* ./server/
RUN cd server && npm config set registry https://registry.npmjs.org/ && npm install --omit=dev

COPY server/ ./server/
COPY client/ ./client/

ENV NODE_ENV=production
ENV PORT=3001
ENV TRUST_PROXY=1

WORKDIR /app/server

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

CMD ["node", "index.js"]
