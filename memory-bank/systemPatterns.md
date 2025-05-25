# TechPortal System Patterns

## Architecture Overview

TechPortal follows a modern full-stack architecture with clear separation of concerns and modular design patterns.

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │◄──►│   (Express)     │◄──►│   (SQLite)      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Management     │    │   Monitoring    │    │   External      │
│  Scripts        │    │   Services      │    │   Systems       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key Design Patterns

### 1. **Layered Architecture**

#### Frontend Layers
- **Presentation Layer**: React components and pages
- **State Management**: React Context and TanStack Query
- **Service Layer**: API client and utilities
- **Component Library**: shadcn/ui components

#### Backend Layers
- **API Layer**: Express routes and middleware
- **Service Layer**: Business logic and application services
- **Data Access Layer**: Drizzle ORM and database operations
- **Infrastructure Layer**: Authentication, logging, monitoring

### 2. **Modular Design**

#### Frontend Modules
```
client/src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   └── layout/         # Layout components
├── pages/              # Page-level components
├── hooks/              # Custom React hooks
├── contexts/           # React contexts for state
├── services/           # API and external services
└── lib/               # Utilities and helpers
```

#### Backend Modules
```
server/
├── routes/             # API route handlers
├── services/           # Business logic services
├── middleware/         # Express middleware
├── db.ts              # Database configuration
└── index.ts           # Application entry point
```

### 3. **Cross-Platform Management Pattern**

#### Script Architecture
```
Management Scripts
├── techportal.sh       # Linux/macOS implementation
├── techportal.bat      # Windows batch implementation
├── techportal.ps1      # Windows PowerShell implementation
└── Common Interface    # Identical command syntax
```

#### Unified Command Pattern
- **Consistent API**: Same commands across all platforms
- **Platform Abstraction**: Platform-specific implementations
- **Error Handling**: Standardized error reporting
- **Process Management**: Unified PID tracking and cleanup

## Component Relationships

### Frontend Component Hierarchy

```
App
├── AuthContext
├── NotificationContext
├── Router
│   ├── Dashboard
│   │   ├── DashboardStats
│   │   ├── ActivityTimeline
│   │   └── RecommendationsCard
│   ├── Applications
│   │   ├── AppCard
│   │   ├── AddAppDialog
│   │   └── EditAppDialog
│   ├── Monitoring
│   │   ├── EndpointMonitoring
│   │   ├── ProcessMonitoring
│   │   └── FailurePrediction
│   └── Settings
└── Layout
    ├── Sidebar
    ├── MobileHeader
    └── ThemeToggle
```

### Backend Service Dependencies

```
Routes
├── AuthRoutes → AuthService → Database
├── AppRoutes → AppService → MonitorService → Database
├── ProcessRoutes → ProcessService → SystemMonitor
└── HealthRoutes → HealthService → All Services

Services
├── MonitorService → ProcessMonitor + EndpointMonitor
├── RecommendationService → AIAnalysis + MonitorData
├── EmailService → SMTP + NotificationService
└── ControllerService → ProcessManager + AppService
```

## Data Flow Patterns

### 1. **Request-Response Flow**

```
Client Request → API Route → Middleware → Service → Database → Response
```

### 2. **Real-time Updates Flow**

```
Monitor Service → Status Change → WebSocket → Client Update → UI Refresh
```

### 3. **Authentication Flow**

```
Login → JWT Generation → Token Storage → Request Headers → Validation → Access
```

## Key Technical Decisions

### 1. **Database Choice: SQLite + Drizzle ORM**
- **Rationale**: Simplicity, portability, type safety
- **Benefits**: No external dependencies, easy backup/restore
- **Trade-offs**: Single-node limitation (acceptable for target use case)

### 2. **Frontend Framework: React 18 + TypeScript**
- **Rationale**: Modern, well-supported, type-safe
- **Benefits**: Component reusability, strong ecosystem
- **Patterns**: Functional components, custom hooks, context API

### 3. **State Management: React Context + TanStack Query**
- **Rationale**: Avoid complexity of Redux for this scale
- **Benefits**: Built-in caching, background updates
- **Patterns**: Context for global state, Query for server state

### 4. **Authentication: JWT with Refresh Tokens**
- **Rationale**: Stateless, scalable, secure
- **Benefits**: No server-side session storage needed
- **Security**: Short-lived access tokens, secure refresh mechanism

### 5. **Process Management: Cross-Platform Scripts**
- **Rationale**: Unified developer experience across platforms
- **Benefits**: Consistent commands, reliable process tracking
- **Implementation**: Platform-specific scripts with identical interfaces

## Monitoring Architecture

### Multi-Layer Monitoring System

```
Application Layer
├── Health Checks (HTTP endpoints)
├── Status Monitoring (application state)
└── Performance Metrics (response times)

Process Layer
├── Process Monitoring (PID tracking)
├── Port Monitoring (network availability)
└── Ghost Process Detection (cleanup)

System Layer
├── Resource Usage (CPU, memory)
├── Disk Space (database growth)
└── Network Connectivity (external dependencies)
```

### Monitoring Data Flow

```
Monitors → Data Collection → Analysis → Alerts → Actions
    ↓           ↓              ↓         ↓        ↓
Scheduled   Database      AI Analysis  Email   Auto-restart
Checks      Storage       Patterns     Notify  Recovery
```

## Security Patterns

### 1. **Defense in Depth**
- **API Level**: Rate limiting, input validation
- **Authentication**: JWT with refresh rotation
- **Authorization**: Role-based access control
- **Data**: Encrypted sensitive information

### 2. **Input Validation Pattern**
```
Request → Zod Schema Validation → Sanitization → Processing
```

### 3. **Error Handling Pattern**
```
Error → Logging → User-Safe Message → Response
```

## Scalability Patterns

### 1. **Horizontal Scaling Preparation**
- **Stateless Design**: No server-side sessions
- **Database**: Ready for migration to PostgreSQL
- **Caching**: Prepared for Redis integration

### 2. **Modular Services**
- **Microservice Ready**: Services can be extracted
- **API First**: Clear service boundaries
- **Configuration**: Environment-based settings

## Development Patterns

### 1. **Type Safety Throughout**
- **Shared Types**: Common types in `/shared`
- **Runtime Validation**: Zod schemas
- **Database Types**: Drizzle type generation

### 2. **Error Handling Strategy**
- **Graceful Degradation**: Fallback behaviors
- **User Feedback**: Clear error messages
- **Logging**: Comprehensive error tracking

### 3. **Testing Strategy** (Future)
- **Unit Tests**: Service and utility functions
- **Integration Tests**: API endpoints
- **E2E Tests**: Critical user workflows

## Performance Patterns

### 1. **Frontend Optimization**
- **Code Splitting**: Route-based chunks
- **Lazy Loading**: Component-level loading
- **Caching**: TanStack Query caching

### 2. **Backend Optimization**
- **Database Indexing**: Query optimization
- **Response Caching**: Static data caching
- **Connection Pooling**: Database connections

### 3. **Asset Optimization**
- **Build Optimization**: Vite bundling
- **Static Assets**: CDN-ready structure
- **Compression**: Gzip/Brotli support

## Deployment Patterns

### 1. **Container Strategy**
- **Multi-stage Builds**: Optimized Docker images
- **Health Checks**: Container health monitoring
- **Volume Management**: Data persistence

### 2. **Configuration Management**
- **Environment Variables**: Runtime configuration
- **Secrets Management**: Secure credential handling
- **Feature Flags**: Environment-based features

### 3. **Monitoring in Production**
- **Health Endpoints**: Application health checks
- **Logging**: Structured logging for aggregation
- **Metrics**: Performance and usage metrics
