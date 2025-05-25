# TechPortal Production Deployment Guide

This guide covers deploying TechPortal to production environments with best practices for security, performance, and reliability.

## 🚀 Quick Start

### Docker Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/techportal.git
cd techportal

# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env

# Build and start with Docker Compose
docker-compose up -d

# Check health
curl http://localhost:3000/api/health
```

### Manual Deployment

```bash
# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Start the application
npm start
```

## 🔧 Environment Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=./data/techportal.db

# Authentication (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-key-minimum-32-characters

# Server
NODE_ENV=production
PORT=3000

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Security Considerations

1. **JWT Secrets**: Generate strong, unique secrets:
   ```bash
   # Generate secure JWT secrets
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Database Security**: Ensure proper file permissions:
   ```bash
   chmod 600 ./data/techportal.db
   chown app:app ./data/techportal.db
   ```

3. **Firewall**: Only expose necessary ports (3000 for the application)

## 🐳 Docker Production Setup

### Docker Compose with Nginx

```yaml
version: '3.8'

services:
  techportal:
    build: .
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    volumes:
      - ./data:/app/data
    networks:
      - techportal-network

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - techportal
    networks:
      - techportal-network

networks:
  techportal-network:
    driver: bridge
```

### Nginx Configuration

```nginx
events {
    worker_connections 1024;
}

http {
    upstream techportal {
        server techportal:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://techportal;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## ☸️ Kubernetes Deployment

### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: techportal
spec:
  replicas: 3
  selector:
    matchLabels:
      app: techportal
  template:
    metadata:
      labels:
        app: techportal
    spec:
      containers:
      - name: techportal
        image: ghcr.io/your-org/techportal:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: techportal-secrets
              key: jwt-secret
        volumeMounts:
        - name: data
          mountPath: /app/data
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: techportal-data
---
apiVersion: v1
kind: Service
metadata:
  name: techportal-service
spec:
  selector:
    app: techportal
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## 🔒 Security Hardening

### 1. System Security

```bash
# Create dedicated user
sudo useradd -r -s /bin/false techportal

# Set file permissions
sudo chown -R techportal:techportal /app
sudo chmod -R 755 /app
sudo chmod 600 /app/.env
```

### 2. Network Security

- Use HTTPS with valid SSL certificates
- Configure firewall to only allow necessary ports
- Use a reverse proxy (Nginx/Apache) for additional security
- Enable rate limiting at the proxy level

### 3. Application Security

- Regularly update dependencies: `npm audit fix`
- Use environment variables for all secrets
- Enable security headers (already configured in the app)
- Monitor for security vulnerabilities

## 📊 Monitoring & Logging

### Health Checks

The application provides several health check endpoints:

- `/api/health` - Comprehensive health check
- `/api/ready` - Readiness check for load balancers
- `/api/live` - Liveness check for container orchestrators

### Logging

Configure log aggregation:

```bash
# Using Docker logs
docker-compose logs -f techportal

# Using journalctl (systemd)
journalctl -u techportal -f
```

### Monitoring Setup

1. **Prometheus Metrics** (if implemented):
   ```yaml
   - job_name: 'techportal'
     static_configs:
       - targets: ['localhost:3000']
   ```

2. **Grafana Dashboard**: Import the provided dashboard configuration

3. **Alerting**: Set up alerts for:
   - High CPU/Memory usage
   - Application errors
   - Database connection issues
   - Failed authentication attempts

## 🔄 Backup & Recovery

### Database Backup

```bash
# Create backup
cp ./data/techportal.db ./backups/techportal-$(date +%Y%m%d-%H%M%S).db

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DB_FILE="./data/techportal.db"
DATE=$(date +%Y%m%d-%H%M%S)

cp $DB_FILE $BACKUP_DIR/techportal-$DATE.db

# Keep only last 30 days
find $BACKUP_DIR -name "techportal-*.db" -mtime +30 -delete
```

### Recovery Process

```bash
# Stop the application
docker-compose down

# Restore database
cp ./backups/techportal-YYYYMMDD-HHMMSS.db ./data/techportal.db

# Start the application
docker-compose up -d
```

## 🚀 Performance Optimization

### 1. Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

### 2. Caching

- Enable HTTP caching headers for static assets
- Consider Redis for session storage in multi-instance deployments
- Use CDN for static assets

### 3. Load Balancing

```nginx
upstream techportal_backend {
    least_conn;
    server techportal-1:3000;
    server techportal-2:3000;
    server techportal-3:3000;
}
```

## 🔧 Maintenance

### Regular Tasks

1. **Weekly**:
   - Check application logs for errors
   - Review security audit logs
   - Update dependencies if needed

2. **Monthly**:
   - Database cleanup (old logs, audit entries)
   - Security vulnerability scan
   - Performance review

3. **Quarterly**:
   - Full security audit
   - Disaster recovery test
   - Capacity planning review

### Update Process

```bash
# 1. Backup current version
docker-compose exec techportal npm run db:backup

# 2. Pull new version
git pull origin main

# 3. Build new image
docker-compose build

# 4. Rolling update
docker-compose up -d --no-deps techportal

# 5. Verify deployment
curl http://localhost:3000/api/health
```

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   ```bash
   # Check file permissions
   ls -la ./data/techportal.db
   
   # Reset database
   npm run db:reset
   ```

2. **High Memory Usage**:
   ```bash
   # Check process memory
   docker stats techportal
   
   # Restart if needed
   docker-compose restart techportal
   ```

3. **Authentication Issues**:
   ```bash
   # Check JWT secrets
   echo $JWT_SECRET | wc -c  # Should be > 32
   
   # Clear sessions
   docker-compose restart techportal
   ```

### Log Analysis

```bash
# Check application logs
docker-compose logs techportal | grep ERROR

# Check authentication logs
docker-compose logs techportal | grep "auth"

# Monitor real-time logs
docker-compose logs -f techportal
```

## 📞 Support

For production support:

1. Check the troubleshooting section above
2. Review application logs
3. Check system resources
4. Verify configuration
5. Contact support with logs and error details

---

**Remember**: Always test deployments in a staging environment before production!
