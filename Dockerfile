# Use the official Node.js image as the base image
FROM node:20

# Set the working directory inside the container
WORKDIR /usr/src/app

# Set default port value
ARG PORT=3001
ENV PORT=$PORT

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy prisma directory and schema
COPY prisma ./prisma/

# Copy the rest of the application files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Expose the port from environment variable
EXPOSE ${PORT}

# Command to run the application
CMD ["node", "dist/main"] 