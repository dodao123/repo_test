FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies (including devDependencies for building)
RUN npm install

COPY . .

# Build the TypeScript code
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
