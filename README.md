# Tech Portal

A comprehensive web application for intelligent application monitoring, performance management, and proactive insights.

## Features

- Real-time application health tracking and monitoring
- Endpoint monitoring and management
- Port conflict detection
- Ghost process management
- Intelligent restart recommendations
- Application failure predictions
- Email notifications for important events
- Comprehensive logging and analytics

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Email**: Nodemailer (SMTP) with optional SendGrid integration

## Prerequisites

- Node.js (v18+)
- PostgreSQL database
- SMTP server access for email notifications (optional)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/tech-portal.git
cd tech-portal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create .env file

Create a `.env` file in the root directory with the following variables:

```
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/techportal

# Session Secret
SESSION_SECRET=your-secret-key

# Port Configuration (Optional - defaults to 5000 for backend)
PORT=5050
```

### 4. Setup the database

Create a PostgreSQL database:

```bash
createdb techportal
```

Or connect to an existing PostgreSQL instance and create the database:

```bash
psql -U postgres
CREATE DATABASE techportal;
```

### 5. Initialize database schema

Run the database migration to set up all the required tables:

```bash
npm run db:push
```

This will create all the necessary tables using the schema defined in `shared/schema.ts`.

## Port Configuration

By default, the application runs on:
- Backend: Port 5000
- Frontend (development): Auto-assigned by Vite

To change the ports:

### Changing Backend Port to 5050

1. Edit `server/index.ts` to use port 5050 instead of 5000:

```typescript
const PORT = process.env.PORT || 5050;
```

### Changing Frontend Port to 5173

1. Add or modify `vite.config.ts` to specify port 5173:

```typescript
server: {
  port: 5173
}
```

## Usage

### Development Mode

Start the application in development mode (with hot reloading):

```bash
npm run dev
```

This starts both the frontend and backend servers.

### Production Mode

Build and start the application in production mode:

```bash
# Build the frontend
npm run build

# Start the production server
npm start
```

## Database Migration

If you make changes to the database schema in `shared/schema.ts`, run the following command to apply the changes:

```bash
npm run db:push
```

## Email Notifications Setup

1. Navigate to the "Integrations" page in the application
2. Enable email notifications using the toggle switch
3. Enter your SMTP server details:
   - SMTP Host (e.g., smtp.gmail.com)
   - SMTP Port (e.g., 587)
   - SMTP Username
   - SMTP Password
   - Sender Email
4. Click "Save Email Settings"
5. Test your configuration by sending a test email

## SendGrid Integration (Alternative)

For SendGrid integration:
1. Create a SendGrid account and obtain an API key
2. Use the following SMTP settings:
   - SMTP Host: smtp.sendgrid.net
   - SMTP Port: 587
   - SMTP Username: apikey
   - SMTP Password: your-sendgrid-api-key

## Deployment Considerations

### Environment Variables

Ensure the following environment variables are set in your production environment:

- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Set to "production"
- `SESSION_SECRET`: Secret for session management
- `PORT`: Backend port (5050)

### Database Backup

Regularly back up your PostgreSQL database:

```bash
pg_dump -U username techportal > techportal_backup.sql
```

### Reverse Proxy (Optional)

For production deployments, consider using Nginx or Apache as a reverse proxy:

#### Nginx Example Config

```nginx
server {
    listen 80;
    server_name yourdomainname.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring and Maintenance

- The system will automatically monitor applications at the interval specified in Settings
- Default monitoring interval is 30 seconds
- Adjust monitoring frequencies in the Settings page
- View logs and activity in the Logs page
- Check restart recommendations and predictions regularly

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Verify the `DATABASE_URL` environment variable is correct
2. Ensure PostgreSQL is running and accessible
3. Check database user permissions

### Email Sending Issues

If email notifications aren't working:

1. Verify SMTP settings in the Integrations page
2. Check if your SMTP server requires special settings (like "Allow less secure apps" for Gmail)
3. Test with SendGrid as an alternative

## License

[MIT License](LICENSE)