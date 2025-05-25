/**
 * Tech Portal Setup Script
 * 
 * This script helps with initial setup of the Tech Portal application:
 * - Validates database connection
 * - Initializes database schema
 * - Creates initial configuration
 * 
 * Run with: node setup.js
 */

const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI colors for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════╗
║                                                        ║
║                  Tech Portal Setup                     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
${colors.reset}`);

// Check if .env file exists, if not create from example
function setupEnvFile() {
  return new Promise((resolve) => {
    if (!fs.existsSync('.env') && fs.existsSync('.env.example')) {
      console.log(`${colors.yellow}No .env file found. Creating from .env.example...${colors.reset}`);
      
      const envExample = fs.readFileSync('.env.example', 'utf8');
      
      rl.question(`\n${colors.bright}PostgreSQL Database URL${colors.reset} (e.g. postgresql://username:password@localhost:5432/techportal): `, (dbUrl) => {
        rl.question(`\n${colors.bright}Port for backend server${colors.reset} [5050]: `, (port) => {
          const backendPort = port || '5050';
          
          rl.question(`\n${colors.bright}Session secret${colors.reset} [auto-generated]: `, (secret) => {
            const sessionSecret = secret || require('crypto').randomBytes(64).toString('hex').slice(0, 32);
            
            // Create .env file
            let envContent = envExample
              .replace(/DATABASE_URL=.*/, `DATABASE_URL=${dbUrl}`)
              .replace(/PORT=.*/, `PORT=${backendPort}`)
              .replace(/SESSION_SECRET=.*/, `SESSION_SECRET=${sessionSecret}`);
            
            fs.writeFileSync('.env', envContent);
            console.log(`${colors.green}✓ Created .env file${colors.reset}`);
            resolve();
          });
        });
      });
    } else if (fs.existsSync('.env')) {
      console.log(`${colors.green}✓ Found existing .env file${colors.reset}`);
      resolve();
    } else {
      console.log(`${colors.red}✗ No .env.example file found. Please create .env file manually.${colors.reset}`);
      resolve();
    }
  });
}

// Test database connection
function testDatabaseConnection() {
  return new Promise((resolve) => {
    console.log(`\n${colors.cyan}Testing database connection...${colors.reset}`);
    
    try {
      // Simple script to test PostgreSQL connection using the DATABASE_URL from .env
      const testScript = `
      require('dotenv').config();
      const { Pool } = require('@neondatabase/serverless');
      
      async function testConnection() {
        if (!process.env.DATABASE_URL) {
          throw new Error("DATABASE_URL not found in environment variables");
        }
        
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        try {
          const result = await pool.query('SELECT NOW()');
          console.log("Connection successful!");
          await pool.end();
          return true;
        } catch (err) {
          console.error("Connection failed:", err.message);
          await pool.end();
          return false;
        }
      }
      
      testConnection()
        .then(success => process.exit(success ? 0 : 1))
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
      `;
      
      // Write temporary test script
      fs.writeFileSync('db-test.js', testScript);
      
      try {
        execSync('node db-test.js', { stdio: 'inherit' });
        console.log(`${colors.green}✓ Database connection successful${colors.reset}`);
        resolve(true);
      } catch (err) {
        console.log(`${colors.red}✗ Database connection failed${colors.reset}`);
        rl.question(`\nWould you like to update the DATABASE_URL? (y/n): `, (answer) => {
          if (answer.toLowerCase() === 'y') {
            rl.question(`\n${colors.bright}PostgreSQL Database URL${colors.reset}: `, (dbUrl) => {
              // Update .env file with new DATABASE_URL
              const envContent = fs.readFileSync('.env', 'utf8')
                .replace(/DATABASE_URL=.*/, `DATABASE_URL=${dbUrl}`);
              
              fs.writeFileSync('.env', envContent);
              console.log(`${colors.green}Updated DATABASE_URL in .env file${colors.reset}`);
              
              // Test connection again
              resolve(testDatabaseConnection());
            });
          } else {
            console.log(`${colors.yellow}Please fix your database connection manually in .env file.${colors.reset}`);
            resolve(false);
          }
        });
      }
    } catch (err) {
      console.log(`${colors.red}✗ Failed to test database connection: ${err.message}${colors.reset}`);
      resolve(false);
    } finally {
      // Clean up test file
      if (fs.existsSync('db-test.js')) {
        fs.unlinkSync('db-test.js');
      }
    }
  });
}

// Initialize database schema
function initializeDatabase() {
  return new Promise((resolve) => {
    console.log(`\n${colors.cyan}Initializing database schema...${colors.reset}`);
    
    try {
      console.log(`${colors.yellow}Running database migration...${colors.reset}`);
      execSync('npm run db:push', { stdio: 'inherit' });
      console.log(`${colors.green}✓ Database schema initialized${colors.reset}`);
      resolve(true);
    } catch (err) {
      console.log(`${colors.red}✗ Failed to initialize database schema: ${err.message}${colors.reset}`);
      resolve(false);
    }
  });
}

// Main setup function
async function setup() {
  try {
    // Setup environment variables
    await setupEnvFile();
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    
    if (dbConnected) {
      // Initialize database schema
      await initializeDatabase();
      
      console.log(`\n${colors.bright}${colors.green}┌─────────────────────────────────────────┐
│                                         │
│  Tech Portal setup completed!           │
│                                         │
└─────────────────────────────────────────┘${colors.reset}`);
      
      console.log(`\n${colors.cyan}To start the application:${colors.reset}`);
      console.log(`  Development mode: ${colors.bright}npm run dev${colors.reset}`);
      console.log(`  Production mode:  ${colors.bright}npm run build && npm start${colors.reset}`);
      
      console.log(`\n${colors.cyan}Access the application at:${colors.reset}`);
      const port = process.env.PORT || 5050;
      console.log(`  http://localhost:${port}`);
    } else {
      console.log(`\n${colors.yellow}Setup incomplete. Please fix the issues and try again.${colors.reset}`);
    }
  } catch (err) {
    console.error(`\n${colors.red}Setup failed: ${err.message}${colors.reset}`);
  } finally {
    rl.close();
    
    // Clean up any temp files
    const tempFiles = ['db-test.js'];
    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  }
}

// Run the setup
setup();