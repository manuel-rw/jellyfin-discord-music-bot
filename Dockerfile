FROM node:16.13.1-alpine3.12
RUN apk add ffmpeg

COPY . /app
WORKDIR /app

EXPOSE 3000

RUN ls -lha
RUN ls dist -lha

CMD ["yarn", "start:prod"]