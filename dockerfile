# Use a imagem base do Node.js com a versão desejada
FROM node:18

# Instale o FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Copie o código do seu projeto para o diretório de trabalho do contêiner
WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --only=production
COPY . .

# Defina o comando de inicialização do contêiner
CMD [ "node", "devServer.js" ]
