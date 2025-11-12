#!/bin/bash

# LearnApp Database Setup Script
echo "🚀 Starting LearnApp Database Setup..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create one based on .env.example"
    exit 1
fi

# Generate Prisma client
echo "📦 Generating Prisma client..."
npm run db:generate

# Run database migrations
echo "🔄 Running database migrations..."
npm run db:migrate

# Seed the database
echo "🌱 Seeding database with sample data..."
npm run db:seed

echo "✅ Database setup completed successfully!"
echo ""
echo "📊 Sample data created:"
echo "  - Admin: admin@learnapp.com"
echo "  - Teachers: john.teacher@learnapp.com, sarah.teacher@learnapp.com"
echo "  - Parent: parent@learnapp.com"
echo "  - Students: alice.student@learnapp.com, bob.student@learnapp.com, charlie.student@learnapp.com"
echo "  - Password for all users: password123"
echo ""
echo "🎉 You can now start the development server with: npm run dev"