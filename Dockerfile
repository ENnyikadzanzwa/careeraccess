FROM node:20-alpine AS base

WORKDIR /app
COPY package.json ./
RUN npm install --production=false

COPY prisma ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN npx tsc

FROM node:20-alpine AS production
WORKDIR /app

COPY --from=base /app/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma

RUN mkdir -p /app/uploads /app/whatsapp-sessions

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
