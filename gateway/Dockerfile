FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
# Install all deps including devDependencies (needed for tsc build)
RUN npm install

COPY . .
RUN npm run build

# data/ directory for bars.json persistence (ephemeral unless Railway Volume mounted)
RUN mkdir -p data

# Console Gateway uses 8081 locally; Railway overrides with $PORT
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:${PORT:-8081}/health || exit 1

CMD ["node", "dist/index.js"]
