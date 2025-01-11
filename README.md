# Portfolio Backend API

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
   git clone <repository-url>
   cd my_portfolio_backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```env
   DATABASE_URL="your-mongodb-connection-string"
   JWT_SECRET="your-jwt-secret"
   JWT_EXPIRES_IN="7d"
   PORT=3001
   NODE_ENV="development"
   ```

4. Push the database schema:
   ```bash
   npx prisma db push
   ```

5. Create an admin user:
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
npm run start:prod
```

## API Documentation

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

## Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── dto/             # Data transfer objects
│   ├── guards/          # Authentication guards
│   └── strategies/      # JWT strategy
├── projects/            # Projects module
│   ├── dto/             # Data transfer objects
│   └── entities/        # Project entities
├── common/              # Shared resources
└── config/              # Configuration
```

## Testing

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Security

- JWT tokens for authentication
- Role-based access control
- Input validation using class-validator
- MongoDB security best practices

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
