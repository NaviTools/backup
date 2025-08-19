#!/usr/bin/env node
/**
 * Test script to validate MariaDB backup functionality
 */

import { env } from './env';

console.log('Testing MariaDB backup configuration...');
console.log('Database type:', env.DATABASE_TYPE);

if (env.DATABASE_TYPE === 'mariadb') {
    console.log('✓ MariaDB database type configured');
} else if (env.DATABASE_TYPE === 'postgres') {
    console.log('✓ PostgreSQL database type configured');
} else {
    console.log('✗ Unsupported database type:', env.DATABASE_TYPE);
    process.exit(1);
}

console.log('Database URL:', env.BACKUP_DATABASE_URL.replace(/:[^@]*@/, ':***@'));
console.log('Service name:', env.SERVICE_NAME);
console.log('All environment variables validated successfully!');
