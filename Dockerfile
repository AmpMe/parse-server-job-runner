FROM node:boron
LABEL maintainer "florent@ampme.com"
ENV NODE_ENV=production
COPY . .
RUN npm install

CMD ["npm", "start"]
