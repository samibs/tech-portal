# 🚀 Tech-Portal- Centralized Application Monitoring & Management Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![Production Ready](https://img.shields.io/badge/Production-Ready-green)](https://github.com/your-org/tech-portal)

> **A comprehensive, production-ready web application for monitoring, managing, and controlling web applications with advanced process monitoring, endpoint health checks, and automated management capabilities.**

Perfect for development teams who need centralized application management, automated monitoring, and intelligent failure prediction.

## ✨ Features

### 🔧 **Application Management**
- **Multi-Application Support** - Manage Frontend, Backend, Database, and other application types
- **Real-time Status Monitoring** - Live tracking of application health and availability
- **Automated Health Checks** - HTTP endpoint monitoring with configurable intervals
- **Application Control** - Start, stop, restart applications with proper error handling
- **Auto-restart Functionality** - Intelligent automatic restart for failed applications

### 📊 **Advanced Monitoring**
- **Multi-layered Monitoring System**:
  - Application status checks (configurable frequency)
  - Endpoint health monitoring (HTTP response validation)
  - Port availability monitoring
  - Process monitoring with ghost process detection
- **Real-time Dashboard** - Live statistics and system overview
- **Response Time Tracking** - Endpoint performance metrics
- **Status Change Logging** - Comprehensive audit trail

### 🔐 **Enterprise Security**
- **Emergency Admin Access** - Secure emergency credentials for initial setup
- **JWT-based Authentication** - Secure token authentication with refresh capabilities
- **Role-based Access Control** - Admin and user permission levels
- **Rate Limiting** - Built-in API protection against abuse
- **Audit Logging** - Comprehensive activity tracking

### 🤖 **Intelligent Automation**
- **Ghost Process Detection** - Automatically identify and terminate orphaned processes
- **Failure Prediction** - AI-powered analysis for proactive issue resolution
- **Smart Recommendations** - Automated suggestions for system optimization
- **Configurable Alerts** - Email and in-app notifications for critical events

### 🎨 **Modern UI/UX**
- **React 18 Frontend** - TypeScript-based with responsive design
- **Professional Dashboard** - Real-time insights and system health overview
- **Dark/Light Theme** - User preference-based theming
- **Mobile-First Design** - Optimized for all device sizes
- **Real-time Updates** - Live data refresh without page reloads

## 🚀 Quick Start

### **Option 1: Docker (Recommended)**

```bash
# Clone the repository
git clone https://github.com/your-org/tech-portal.git
cd tech-portal

# Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# Start with Docker Compose
docker-compose up -d

# Access the application
open http://localhost:5050
```

### **Option 2: Manual Installation**

```bash
# Prerequisites: Node.js 18+, npm 8+
git clone https://github.com/your-org/tech-portal.git
cd tech-portal

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Build the application
npm run build

# Start production server
npm start

# Or start development server
npm run dev
```

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **Git** for version control

## 🔧 Configuration

### **Environment Variables**

Create a `.env` file from `.env.example`:

```env
# Database
DATABASE_URL=./data/techportal.db

# Authentication (CHANGE IN PRODUCTION!)
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

### **First-Time Setup**

1. Start the application: `npm start`
2. Navigate to `http://localhost:5050`
3. Use emergency admin credentials for initial access
4. Create your admin account through the setup process
5. Begin registering and managing your web applications

## 🏗️ Architecture

### **Technology Stack**

**Backend:**
- **Node.js + Express** - High-performance server framework
- **TypeScript** - Type-safe development with full IntelliSense
- **SQLite + Drizzle ORM** - Lightweight, reliable database with type-safe queries
- **Zod Validation** - Runtime type checking and data validation
- **JWT Authentication** - Secure token-based authentication

**Frontend:**
- **React 18** - Modern React with hooks and context API
- **TypeScript** - Type-safe frontend development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Professional component library
- **TanStack Query** - Efficient data fetching and caching
- **Wouter** - Lightweight routing solution

**Monitoring & DevOps:**
- **Multi-interval Monitoring** - Configurable check frequencies
- **Docker** - Containerization with multi-stage builds
- **GitHub Actions** - CI/CD pipeline with automated testing
- **ESLint + Prettier** - Code quality and formatting
- **Health Checks** - Production monitoring endpoints

## 📊 API Documentation

### **Authentication**
```http
POST /api/auth/login          # User login
POST /api/auth/refresh        # Token refresh
POST /api/auth/logout         # User logout
GET  /api/auth/me            # Get current user info
```

### **Application Management**
```http
GET    /api/apps             # List all applications
POST   /api/apps             # Create new application
GET    /api/apps/:id         # Get specific application
PATCH  /api/apps/:id         # Update application
DELETE /api/apps/:id         # Delete application
POST   /api/apps/:id/start   # Start application
POST   /api/apps/:id/stop    # Stop application
POST   /api/apps/:id/restart # Restart application
```

### **Monitoring & Analytics**
```http
GET /api/endpoints           # List monitored endpoints
POST /api/endpoints          # Add endpoint monitoring
GET /api/ports              # List monitored ports
GET /api/processes          # List monitored processes
GET /api/logs               # Get application logs
GET /api/predictions        # Get failure predictions
GET /api/recommendations    # Get optimization recommendations
GET /api/stats              # Get system statistics
```

### **Health & System**
```http
GET /api/health              # Comprehensive health check
GET /api/ready               # Readiness check
GET /api/live                # Liveness check
```

## 🔍 Monitoring Features

### **Application Monitoring**
- **HTTP Health Checks** - Automated endpoint availability testing
- **Port Connectivity** - Network port accessibility verification
- **Response Time Tracking** - Performance metrics collection
- **Status Change Detection** - Real-time status transition logging

### **Process Management**
- **Ghost Process Detection** - Identify orphaned/zombie processes
- **Automatic Cleanup** - Configurable ghost process termination
- **Process Lifecycle Tracking** - Monitor process start/stop events
- **Resource Usage Monitoring** - CPU and memory consumption tracking

### **Intelligent Features**
- **Auto-restart Logic** - Smart application recovery
- **Failure Prediction** - AI-powered failure analysis
- **Performance Recommendations** - Optimization suggestions
- **Alert System** - Configurable notification thresholds

## 🐳 Production Deployment

### **Docker Deployment**

```bash
# Production deployment with Docker
docker-compose -f docker-compose.yml up -d

# With custom environment
docker-compose --env-file .env.production up -d

# View logs
docker-compose logs -f
```

### **Manual Production Setup**

```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name tech-portal
```

For detailed production deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🧪 Development

### **Development Setup**

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build
```

### **Database Management**

```bash
# Generate database schema
npm run db:generate

# Run migrations
npm run db:migrate

# Open database studio
npm run db:studio

# Reset database (development only)
npm run db:reset
```

### **Docker Development**

```bash
# Build development image
docker build -t tech-portal:dev .

# Run in container
docker run -p 5050:5050 tech-portal:dev

# Development with compose
docker-compose -f docker-compose.dev.yml up
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### **Quick Contribution Steps**

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Guidelines**

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 🔧 Recent Updates

### **v1.0.0 - Production Ready Release**
- ✅ **Fixed Schema Consistency** - Resolved `AppsUrl` vs `appUrl` field naming issues
- ✅ **Enhanced Monitoring** - Multi-layered monitoring with configurable frequencies
- ✅ **Improved UI/UX** - Professional dashboard with real-time updates
- ✅ **Production Deployment** - Docker support and production optimizations
- ✅ **Security Enhancements** - Emergency admin access and JWT authentication
- ✅ **Comprehensive Testing** - Full application testing and validation

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Community

- **📖 Documentation**: [Full Documentation](https://github.com/your-org/tech-portal/wiki)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/your-org/tech-portal/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/your-org/tech-portal/discussions)

## 🙏 Acknowledgments

- Built with ❤️ for the developer community
- Inspired by the need for centralized application management
- Thanks to all contributors and users

## 📈 Roadmap

- [ ] **Advanced Metrics** - Prometheus/Grafana integration
- [ ] **Multi-tenant Support** - Organization and team management
- [ ] **Advanced AI** - Machine learning for predictive analytics
- [ ] **Plugin System** - Extensible architecture
- [ ] **Mobile App** - Native mobile applications
- [ ] **Cloud Integration** - Multi-cloud deployment support

---

**Made with ❤️ for developers who need better application management tools.**

[⬆ Back to top](#-tech-portal---centralized-application-monitoring--management-platform)
