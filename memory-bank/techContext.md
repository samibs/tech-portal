# TechPortal Technical Context

## Technology Stack

### Frontend Technologies

#### Core Framework
- **React 18.3.1** - Modern React with concurrent features
- **TypeScript 5.6.3** - Type-safe JavaScript development
- **Vite 5.4.14** - Fast build tool and development server

#### UI Framework & Styling
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library built on Radix UI
- **Radix UI** - Unstyled, accessible UI primitives
- **Framer Motion 11.13.1** - Animation library
- **Lucide React 0.453.0** - Icon library

#### State Management & Data Fetching
- **TanStack Query 5.60.5** - Server state management with caching
- **React Context API** - Global state management
- **React Hook Form 7.55.0** - Form state management
- **Zod 3.24.2** - Runtime type validation

#### Routing & Navigation
- **Wouter 3.3.5** - Lightweight routing library

### Backend Technologies

#### Core Framework
- **Node.js 18+** - JavaScript runtime
- **Express 4.21.2** - Web application framework
- **TypeScript 5.6.3** - Type-safe server development

#### Database & ORM
- **SQLite** - Embedded database (via @libsql/client 0.14.0)
- **Drizzle ORM 0.39.1** - Type-safe SQL ORM
- **Drizzle Kit 0.30.4** - Database migrations and introspection

#### Authentication & Security
- **JSON Web Tokens (jsonwebtoken 9.0.2)** - Stateless authentication
- **bcrypt 6.0.0** - Password hashing
- **Helmet 8.1.0** - Security headers middleware
- **Express Rate Limit 7.5.0** - API rate limiting
- **Express Session 1.18.1** - Session management

#### Monitoring & Communication
- **WebSockets (ws 8.18.0)** - Real-time communication
- **SendGrid Mail 8.1.5** - Email service integration
- **Nodemailer 6.10.1** - Email sending
- **Node Fetch 3.3.2** - HTTP client

### Development Tools

#### Code Quality
- **ESLint 8.0.0** - JavaScript/TypeScript linting
- **Prettier 3.0.0** - Code formatting
- **TypeScript ESLint** - TypeScript-specific linting rules

#### Build Tools
- **esbuild 0.25.0** - Fast JavaScript bundler
- **PostCSS 8.4.47** - CSS processing
- **Autoprefixer 10.4.20** - CSS vendor prefixing

#### Development Server
- **tsx 4.19.1** - TypeScript execution for development
- **Vite Plugin React 4.3.2** - React support for Vite

### Deployment Technologies

#### Containerization
- **Docker** - Application containerization
- **Docker Compose** - Multi-container orchestration

#### Process Management
- **Custom Management Scripts** - Cross-platform process management
  - `techportal.sh` (Linux/macOS)
  - `techportal.bat` (Windows CMD)
  - `techportal.ps1` (Windows PowerShell)

## Development Environment

### Prerequisites
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Git**: For version control
- **Modern Browser**: Chrome, Firefox, Safari, Edge

### Environment Configuration

#### Required Environment Variables
```env
# Database
DATABASE_URL=./data/techportal.db

# Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-key-minimum-32-characters

# Server
NODE_ENV=production
PORT=5050

# Monitoring Configuration
CHECK_FREQUENCY=30
ENDPOINT_CHECK_FREQUENCY=60
PORT_CHECK_FREQUENCY=120
PROCESS_CHECK_FREQUENCY=300

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Development Scripts

#### Package.json Scripts
```json
{
  "dev": "NODE_ENV=development tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "type-check": "tsc --noEmit",
  "lint": "eslint . --ext .ts,.tsx --fix",
  "lint:check": "eslint . --ext .ts,.tsx",
  "db:push": "drizzle-kit push",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio",
  "db:reset": "rm -f ./data/techportal.db && npm run db:generate && npm run db:migrate"
}
```

## Technical Constraints

### Performance Requirements
- **Response Time**: < 2 seconds for API requests
- **Build Time**: < 30 seconds for production builds
- **Memory Usage**: < 512MB for typical workloads
- **Database Size**: Optimized for < 1GB databases

### Browser Support
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **JavaScript**: ES2020+ features
- **CSS**: Modern CSS features with Tailwind

### Platform Support
- **Operating Systems**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)
- **Node.js**: 18.0.0+ (LTS versions recommended)
- **Architecture**: x64, ARM64 (Apple Silicon)

## Dependencies Analysis

### Critical Dependencies
- **React Ecosystem**: Core UI framework
- **Express**: Backend API framework
- **Drizzle ORM**: Database operations
- **JWT**: Authentication system
- **Zod**: Data validation

### Development Dependencies
- **TypeScript**: Type safety
- **Vite**: Build tooling
- **ESLint/Prettier**: Code quality
- **Drizzle Kit**: Database tooling

### Optional Dependencies
- **Email Services**: SendGrid/Nodemailer for notifications
- **Monitoring**: Custom monitoring services
- **AI Analysis**: Anthropic SDK for recommendations

## Build Configuration

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/client',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
});
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Drizzle Configuration
```typescript
// drizzle.config.ts
export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  driver: "libsql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "./data/techportal.db"
  }
};
```

## Security Configuration

### Authentication Flow
1. **Login**: Username/password validation
2. **JWT Generation**: Access token (15min) + Refresh token (7 days)
3. **Token Storage**: HttpOnly cookies for refresh, memory for access
4. **Token Refresh**: Automatic refresh before expiration
5. **Logout**: Token invalidation

### API Security
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Zod schemas for all inputs
- **CORS**: Configured for frontend domain
- **Security Headers**: Helmet middleware
- **SQL Injection**: Prevented by Drizzle ORM

### Data Protection
- **Password Hashing**: bcrypt with salt rounds
- **Sensitive Data**: Environment variables
- **Database**: File permissions (600)
- **Logs**: No sensitive data logging

## Monitoring & Observability

### Health Checks
- **Application Health**: `/api/health`
- **Readiness Check**: `/api/ready`
- **Liveness Check**: `/api/live`

### Logging Strategy
- **Structured Logging**: JSON format for production
- **Log Levels**: Error, Warn, Info, Debug
- **Log Rotation**: File-based with size limits
- **Error Tracking**: Comprehensive error context

### Performance Monitoring
- **Response Times**: API endpoint timing
- **Database Queries**: Query performance tracking
- **Memory Usage**: Process memory monitoring
- **CPU Usage**: System resource tracking

## Deployment Architecture

### Docker Configuration
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 5050
CMD ["npm", "start"]
```

### Environment-Specific Configurations
- **Development**: Hot reloading, debug logging
- **Staging**: Production build, test data
- **Production**: Optimized build, security hardening

## Future Technical Considerations

### Scalability Preparations
- **Database**: Ready for PostgreSQL migration
- **Caching**: Redis integration points identified
- **Load Balancing**: Stateless design supports horizontal scaling
- **Microservices**: Service boundaries defined for extraction

### Technology Upgrades
- **React 19**: Planned upgrade path
- **Node.js LTS**: Regular updates to latest LTS
- **Dependencies**: Monthly security updates
- **TypeScript**: Latest stable version adoption

### Performance Optimizations
- **Code Splitting**: Route-based and component-based
- **Lazy Loading**: Dynamic imports for large components
- **Bundle Analysis**: Regular bundle size monitoring
- **Database Indexing**: Query optimization strategies
