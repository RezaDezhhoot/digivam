FROM node:25-alpine AS builder

WORKDIR /app

#RUN npm config set registry https://mirror-npm.runflare.com

COPY ./src/package*.json .

RUN npm ci

COPY ./src .

FROM node:25-alpine

ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

WORKDIR /app
#RUN npm config set registry https://mirror-npm.runflare.com
RUN npm install -g pm2

COPY --from=builder /app . 

CMD ["pm2-runtime", "index.js", "-i", "5"]