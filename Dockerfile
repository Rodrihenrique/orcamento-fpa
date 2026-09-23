# Estágio 1: Build da aplicação React + Vite
FROM node:20-alpine AS build

WORKDIR /app

# Copia manifestos de pacotes e instala dependências
COPY package*.json ./
RUN npm install

# Copia todo o código-fonte e gera o build de produção
COPY . .
RUN npm run build

# Estágio 2: Imagem final com Nginx Alpine (leve, rápida e segura)
FROM nginx:alpine

# Remove configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copia configuração customizada para o Cloud Run (porta 8080 e suporte a SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos compilados do estágio anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Porta padrão requerida pelo Google Cloud Run
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
