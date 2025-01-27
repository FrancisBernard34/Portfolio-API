# Portfolio Backend API

<div align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="nestjs">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript">
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="prisma">
  <img src="https://img.shields.io/badge/Docker-blue?style=for-the-badge&logo=docker&logoColor=white" alt="docker">
  <img src="https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazonwebservices&logoColor=white" alt="aws">
  <img src="https://img.shields.io/badge/-MongoDB-13aa52?style=for-the-badge&logo=mongodb&logoColor=white" alt="mongodb">
  <img src="https://img.shields.io/badge/Jest-323330?style=for-the-badge&logo=Jest&logoColor=white" alt="jest">
</div>

A NestJS-based REST API for managing portfolio projects. This backend service provides endpoints for creating, reading, updating, and deleting portfolio projects, with authentication and role-based access control.

## Features

- 🔐 JWT Authentication
- 👥 Role-based access control (Admin/User)
- 📁 Project management with CRUD operations
- 🏷️ Category-based filtering
- 📊 Importance-based sorting
- 📚 Swagger API documentation
- 🗃️ MongoDB integration
- ✅ Input validation

## Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB instance
- npm or yarn package manager

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/FrancisBernard34/Portfolio-API/
   cd Portfolio-API
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Rename the `.env.example` to `.env` in the root directory and update the variables with your own data:
   ```env
   PORT=3001
   NODE_ENV="development"
   DATABASE_URL="your-mongodb-connection-string"
   JWT_SECRET="your-jwt-secret"
   JWT_EXPIRES_IN="7d"
   JWT_REFRESH_SECRET=your-super-secret-refresh-key
   JWT_REFRESH_EXPIRES_IN=7d
   EMAIL_USER=your.email@gmail.com
   EMAIL_APP_PASSWORD=your-16-character-app-password
   ```

4. Generate the Prisma Client
   ```bash
   npx prisma generate
   ```

4. Push the database schema:
   ```bash
   npx prisma db push
   ```

5. Create an admin user (login details at the `/src/scripts/create-admin.ts`):
   ```bash
   npm run create:admin
   ```

## Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start
```

## API Documentation (Only Available in Development Mode)

Once the application is running, you can access the Swagger documentation at:
```
http://localhost:3001/docs
```

### Main Endpoints

#### Authentication
- POST `/api/auth/login` - Login with email and password

#### Projects (Public)
- GET `/api/projects` - List all projects
  - Query parameters:
    - category: Filter by category (DEFAULT, FULL_STACK, FRONT_END, BACK_END, MOBILE, GAME)
    - featured: Filter featured projects (boolean)
    - sort: Sort by field (importance, createdAt)
    - order: Sort order (asc, desc)
- GET `/api/projects/:id` - Get a specific project

#### Projects (Protected - Admin Only)
- POST `/api/projects` - Create a new project
- PATCH `/api/projects/:id` - Update a project
- DELETE `/api/projects/:id` - Delete a project

#### Contact Form (Public)
- POST `/api/contact` - Process the front-end contact form


## Testing

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e
```

## Security

- JWT tokens for authentication
- Role-based access control
- Input validation using class-validator
- MongoDB security best practices


## License

This project is licensed under the MIT License - see the LICENSE file for details.
