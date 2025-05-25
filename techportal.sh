#!/bin/bash

# Tech Portal Management Script for Linux/macOS
# Usage: ./techportal.sh [start|stop|restart|status|dev|build] [options]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="TechPortal"
PID_FILE="./techportal.pid"
LOG_FILE="./techportal.log"
PORT=${PORT:-5050}

# Function to print colored output
print_status() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if process is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Function to get process status
get_status() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "${GREEN}● $APP_NAME is running${NC} (PID: $pid)"
        echo "  Port: $PORT"
        echo "  Log file: $LOG_FILE"
        echo "  PID file: $PID_FILE"
        
        # Check if port is actually listening
        if command -v netstat >/dev/null 2>&1; then
            if netstat -tuln | grep ":$PORT " > /dev/null; then
                echo -e "  Status: ${GREEN}Listening on port $PORT${NC}"
            else
                echo -e "  Status: ${YELLOW}Process running but not listening on port $PORT${NC}"
            fi
        fi
    else
        echo -e "${RED}● $APP_NAME is not running${NC}"
    fi
}

# Function to start the application
start_app() {
    local mode=${1:-production}
    
    if is_running; then
        print_warning "$APP_NAME is already running"
        get_status
        return 1
    fi
    
    print_status "Starting $APP_NAME in $mode mode..."
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
        if [ $? -ne 0 ]; then
            print_error "Failed to install dependencies"
            return 1
        fi
    fi
    
    # Start based on mode
    case $mode in
        "development"|"dev")
            print_status "Starting in development mode..."
            nohup npm run dev > "$LOG_FILE" 2>&1 &
            ;;
        "production"|"prod")
            print_status "Building application..."
            npm run build
            if [ $? -ne 0 ]; then
                print_error "Build failed"
                return 1
            fi
            print_status "Starting in production mode..."
            nohup npm start > "$LOG_FILE" 2>&1 &
            ;;
        *)
            print_error "Invalid mode: $mode. Use 'dev' or 'prod'"
            return 1
            ;;
    esac
    
    local pid=$!
    echo $pid > "$PID_FILE"
    
    # Wait a moment and check if it started successfully
    sleep 3
    if is_running; then
        print_success "$APP_NAME started successfully"
        echo "  PID: $pid"
        echo "  Mode: $mode"
        echo "  URL: http://localhost:$PORT"
        echo "  Logs: tail -f $LOG_FILE"
    else
        print_error "Failed to start $APP_NAME"
        if [ -f "$LOG_FILE" ]; then
            echo "Last few lines from log:"
            tail -10 "$LOG_FILE"
        fi
        return 1
    fi
}

# Function to stop the application
stop_app() {
    if ! is_running; then
        print_warning "$APP_NAME is not running"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    print_status "Stopping $APP_NAME (PID: $pid)..."
    
    # Try graceful shutdown first
    kill "$pid" 2>/dev/null
    
    # Wait for graceful shutdown
    local count=0
    while [ $count -lt 10 ] && ps -p "$pid" > /dev/null 2>&1; do
        sleep 1
        count=$((count + 1))
    done
    
    # Force kill if still running
    if ps -p "$pid" > /dev/null 2>&1; then
        print_warning "Graceful shutdown failed, forcing termination..."
        kill -9 "$pid" 2>/dev/null
        sleep 2
    fi
    
    # Clean up
    rm -f "$PID_FILE"
    
    if ps -p "$pid" > /dev/null 2>&1; then
        print_error "Failed to stop $APP_NAME"
        return 1
    else
        print_success "$APP_NAME stopped successfully"
    fi
}

# Function to restart the application
restart_app() {
    local mode=${1:-production}
    print_status "Restarting $APP_NAME..."
    
    if is_running; then
        stop_app
        sleep 2
    fi
    
    start_app "$mode"
}

# Function to show logs
show_logs() {
    local lines=${1:-50}
    
    if [ -f "$LOG_FILE" ]; then
        echo -e "${CYAN}Last $lines lines from $LOG_FILE:${NC}"
        echo "----------------------------------------"
        tail -n "$lines" "$LOG_FILE"
    else
        print_warning "Log file not found: $LOG_FILE"
    fi
}

# Function to follow logs
follow_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo -e "${CYAN}Following logs from $LOG_FILE (Ctrl+C to stop):${NC}"
        echo "----------------------------------------"
        tail -f "$LOG_FILE"
    else
        print_warning "Log file not found: $LOG_FILE"
    fi
}

# Function to show help
show_help() {
    echo -e "${BOLD}$APP_NAME Management Script${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo -e "${BOLD}Commands:${NC}"
    echo "  start [dev|prod]    Start the application (default: prod)"
    echo "  stop                Stop the application"
    echo "  restart [dev|prod]  Restart the application (default: prod)"
    echo "  status              Show application status"
    echo "  logs [lines]        Show last N lines of logs (default: 50)"
    echo "  follow              Follow logs in real-time"
    echo "  build               Build the application"
    echo "  dev                 Start in development mode (alias for 'start dev')"
    echo "  help                Show this help message"
    echo ""
    echo -e "${BOLD}Examples:${NC}"
    echo "  $0 start            # Start in production mode"
    echo "  $0 start dev        # Start in development mode"
    echo "  $0 dev              # Start in development mode"
    echo "  $0 restart prod     # Restart in production mode"
    echo "  $0 logs 100         # Show last 100 log lines"
    echo "  $0 follow           # Follow logs in real-time"
}

# Main script logic
case "${1:-help}" in
    "start")
        start_app "${2:-production}"
        ;;
    "stop")
        stop_app
        ;;
    "restart")
        restart_app "${2:-production}"
        ;;
    "status")
        get_status
        ;;
    "logs")
        show_logs "${2:-50}"
        ;;
    "follow")
        follow_logs
        ;;
    "build")
        print_status "Building $APP_NAME..."
        npm run build
        ;;
    "dev")
        start_app "development"
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
