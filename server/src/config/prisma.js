const { PrismaClient } = require('@prisma/client');

// Export a single PrismaClient instance across the app to prevent exhausting database connection pools
const prisma = new PrismaClient();

module.exports = prisma;
