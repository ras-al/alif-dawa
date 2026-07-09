FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Run build if using typescript
# RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "dev"]
