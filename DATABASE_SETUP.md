# Database Setup Guide

This guide explains how to set up the LearnApp database with migrations and seed data.

## Prerequisites

1. PostgreSQL database server running
2. Environment variables configured in `.env` file
3. Node.js and npm installed

## Database Configuration

Make sure your `.env` file contains the correct database URL:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/learnapp_db?schema=public"
```

Replace `username`, `password`, and database name as needed.

## Running Migrations

### Option 1: Run migrations with development mode (recommended)
```bash
npm run db:migrate
```

This command will:
- Apply all pending migrations
- Generate the Prisma client
- Create the database if it doesn't exist

### Option 2: Push schema directly (for development)
```bash
npm run db:push
```

This command will:
- Push the schema directly to the database
- Generate the Prisma client
- Useful for rapid prototyping

## Seeding the Database

After running migrations, seed the database with sample data:

```bash
npm run db:seed
```

This will create:
- **1 Admin user**: admin@learnapp.com
- **2 Teacher users**: john.teacher@learnapp.com, sarah.teacher@learnapp.com
- **1 Parent user**: parent@learnapp.com
- **3 Student users**: alice.student@learnapp.com, bob.student@learnapp.com, charlie.student@learnapp.com
- **3 Courses**: Mathematics, Science, English Literature
- **5 Course sections** with organized content
- **6 Lessons** with video URLs and content
- **5 Student enrollments** across different courses
- **2 Sample quizzes** with multiple choice questions

### Default Login Credentials

All users have the same password: `password123`

**Admin Login:**
- Email: admin@learnapp.com
- Password: password123

**Teacher Logins:**
- Email: john.teacher@learnapp.com / Password: password123
- Email: sarah.teacher@learnapp.com / Password: password123

**Parent Login:**
- Email: parent@learnapp.com / Password: password123

**Student Logins:**
- Email: alice.student@learnapp.com / Password: password123
- Email: bob.student@learnapp.com / Password: password123
- Email: charlie.student@learnapp.com / Password: password123

## Database Schema Overview

The database includes the following main entities:

### Users and Roles
- **Users**: Base user table with authentication info
- **Students**: Student profiles linked to users
- **Teachers**: Teacher profiles linked to users
- **Parents**: Parent profiles linked to users
- **RefreshTokens**: JWT refresh token management

### Course Management
- **Courses**: Course information and teacher assignments
- **Sections**: Course sections for organization
- **Lessons**: Individual lessons with content and videos
- **Enrollments**: Student course enrollments

### Assessment System
- **Quizzes**: Quiz metadata and settings
- **Questions**: Quiz questions with ordering
- **Choices**: Multiple choice answers
- **Attempts**: Student quiz attempts
- **Responses**: Student answers to questions

### Progress Tracking
- **Completions**: Lesson completion tracking

## Useful Commands

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Reset database (careful - this deletes all data!)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio

# Check migration status
npx prisma migrate status
```

## Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Check database URL in `.env` file
3. Verify database exists and user has proper permissions

### Migration Issues
1. If migrations fail, check database logs
2. Ensure no conflicting schema changes
3. Consider resetting with `npx prisma migrate reset` (development only)

### Seed Data Issues
1. Ensure migrations have been applied first
2. Check for unique constraint violations
3. Clear existing data if needed before re-seeding

## Development Workflow

1. Make schema changes in `prisma/schema.prisma`
2. Run `npm run db:migrate` to create and apply migration
3. Update seed data if needed
4. Run `npm run db:seed` to populate with test data
5. Use `npx prisma studio` to inspect data visually