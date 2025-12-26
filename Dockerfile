FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built files and production dependencies
COPY --from=base /app/dist ./dist
COPY --from=base /app/src/data ./src/data
COPY --from=base /app/package.json ./
RUN npm install --omit=dev

EXPOSE 8080

ENV PORT=8080

CMD ["node", "dist/index.js"]
