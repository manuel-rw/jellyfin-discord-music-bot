FROM node:16.17.1-alpine
RUN apk add ffmpeg

COPY . /app
WORKDIR /app
RUN yarn install --immutable
RUN yarn build

RUN ls -lha
RUN ls dist -lha

CMD ["yarn", "start:prod"]