FROM docker.arvancloud.ir/node:25-alpine

WORKDIR /app

ARG PORT
ENV PORT=${PORT}
COPY ./src/. .

#RUN npm config set registry https://mirror-npm.runflare.com
RUN npm i 
RUN npm i -g vite

RUN npm run build

RUN npm i -g serve

EXPOSE ${PORT}
CMD ["sh", "-c", "serve -s dist -p $PORT"]