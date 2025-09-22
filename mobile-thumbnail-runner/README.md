# Hash Mobile Thumbnail Generator

A mobile-friendly web interface for running the Hash thumbnail generator script from your phone.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   cd /Users/user/Desktop/hash/scripts/mobile-thumbnail-runner
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Find your computer's IP address:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig | findstr "IPv4"
   ```

4. **Access from your phone:**
   - Open browser on phone
   - Go to `http://[your-computer-ip]:3001`
   - Enter access key: `hash-thumbnails-2025`
   - Click "Generate Thumbnails"

## 📱 Features

- **Mobile-responsive design** - Optimized for phone screens
- **Real-time progress tracking** - See generation progress live
- **Authentication** - Simple key-based access control
- **Live logs** - View detailed processing logs
- **Job management** - Check status of running/completed jobs
- **Auto-cleanup** - Removes old job data automatically

## 🔧 How It Works

1. The web interface runs an Express.js server on your computer
2. When you trigger thumbnail generation from your phone, it executes the Python script
3. Real-time progress updates are streamed to your phone
4. You can monitor logs and check job status remotely

## 🛡️ Security

- Simple token-based authentication (`hash-thumbnails-2025`)
- Server only accessible from your local network
- No external internet access required
- Automatic cleanup of old job data

## 📊 API Endpoints

- `POST /api/generate-thumbnails` - Start thumbnail generation
- `GET /api/generate-thumbnails?jobId=<id>` - Check job status  
- `GET /api/generate-thumbnails` - List recent jobs
- `DELETE /api/generate-thumbnails` - Cancel running job
- `GET /health` - Server health check

## 🔧 Configuration

- **Port**: Default 3001 (change with `PORT` environment variable)
- **Access Key**: `hash-thumbnails-2025` (hardcoded for security)
- **Job Retention**: Keeps last 50 jobs, cleans up hourly
- **Log Retention**: Shows last 20 log entries per job

## 🚨 Troubleshooting

**Server won't start:**
- Make sure port 3001 is not in use
- Check that Node.js is installed (`node --version`)

**Can't access from phone:**
- Ensure phone and computer are on same WiFi network
- Check firewall isn't blocking port 3001
- Verify IP address is correct

**Python script not found:**
- Make sure `generate_thumbnails.py` exists in parent directory
- Check Python 3 is installed and accessible

**Authentication fails:**
- Verify access key is exactly: `hash-thumbnails-2025`
- Case-sensitive, no extra spaces

## 📱 Mobile Usage Tips

- **Bookmark** the page for quick access
- **Keep screen awake** during long processing jobs
- **Check logs** if generation seems stuck
- **Use WiFi** for best performance (not mobile data)

## 🛠️ Development

```bash
# Install with dev dependencies
npm install

# Run with auto-restart on changes
npm run dev

# Check server health
curl http://localhost:3001/health
```

## 📝 Example Usage

1. Start server on computer: `npm start`
2. Note IP address from startup message
3. On phone, browse to `http://192.168.1.100:3001` (example IP)
4. Enter access key: `hash-thumbnails-2025`
5. Click "Generate Thumbnails"
6. Monitor progress in real-time
7. Check logs if needed
8. Job completes automatically

The interface will show:
- ✅ Success count
- ❌ Error count  
- 🔄 Current progress
- 📊 Processing statistics
- 📝 Live processing logs

Perfect for running thumbnail generation remotely while away from your computer!