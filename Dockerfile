FROM node:16.17.1-alpine
RUN apk add ffmpeg

COPY . /app
WORKDIR /app
RUN yarn install --production

CMD yarn start:prod