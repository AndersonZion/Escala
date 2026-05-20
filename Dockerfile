FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY src/ ./src/

# Expor porta
EXPOSE 3333

# Comando para rodar
CMD ["node", "src/server.js"]