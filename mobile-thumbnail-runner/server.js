#!/usr/bin/env node

/**
 * Mobile Thumbnail Generator Server
 * 
 * Express server that provides a web interface for running the thumbnail generator
 * from mobile devices. Executes the Python script and provides real-time status.
 */

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Store active jobs
const jobs = new Map();

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Simple authentication middleware
function authenticate(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token === 'hash-thumbnails-2025') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to start thumbnail generation
app.post('/api/generate-thumbnails', authenticate, async (req, res) => {
    const { dryRun = false } = req.body;
    const jobId = uuidv4();
    
    try {
        console.log(`🚀 Starting thumbnail generation job: ${jobId}`);
        
        // Path to the Python script
        const scriptPath = path.join(__dirname, '..', 'generate_thumbnails.py');
        
        // Verify script exists
        if (!fs.existsSync(scriptPath)) {
            throw new Error('Thumbnail generator script not found');
        }
        
        // Prepare command arguments
        const args = ['python3', scriptPath];
        if (dryRun) {
            args.push('--dry-run');
        }
        
        // Create job record
        const job = {
            id: jobId,
            status: 'running',
            startTime: new Date(),
            processed: 0,
            errors: 0,
            logs: [],
            progress: 'Initializing...'
        };
        
        jobs.set(jobId, job);
        
        // Start the Python process
        const pythonProcess = spawn(args[0], args.slice(1), {
            cwd: path.dirname(scriptPath),
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1' // Ensure real-time output
            }
        });
        
        job.process = pythonProcess;
        
        // Handle process output
        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            job.logs.push(`[STDOUT] ${output.trim()}`);
            
            // Parse progress information
            if (output.includes('Processing')) {
                const match = output.match(/Processing (\d+)\/(\d+)/);
                if (match) {
                    job.progress = `Processing ${match[1]}/${match[2]} events`;
                }
            }
            
            if (output.includes('Successfully processed:')) {
                const match = output.match(/Successfully processed: (\d+)/);
                if (match) {
                    job.processed = parseInt(match[1]);
                }
            }
            
            if (output.includes('Errors encountered:')) {
                const match = output.match(/Errors encountered: (\d+)/);
                if (match) {
                    job.errors = parseInt(match[1]);
                }
            }
            
            console.log(`[${jobId}] ${output.trim()}`);
        });
        
        pythonProcess.stderr.on('data', (data) => {
            const output = data.toString();
            job.logs.push(`[STDERR] ${output.trim()}`);
            console.error(`[${jobId}] ERROR: ${output.trim()}`);
        });
        
        pythonProcess.on('close', (code) => {
            job.endTime = new Date();
            job.exitCode = code;
            
            if (code === 0) {
                job.status = 'completed';
                job.progress = 'Generation completed successfully';
                console.log(`✅ Job ${jobId} completed successfully`);
            } else {
                job.status = 'failed';
                job.error = `Process exited with code ${code}`;
                job.progress = 'Generation failed';
                console.log(`❌ Job ${jobId} failed with exit code ${code}`);
            }
        });
        
        pythonProcess.on('error', (error) => {
            job.status = 'failed';
            job.error = error.message;
            job.endTime = new Date();
            console.error(`💥 Job ${jobId} error:`, error.message);
        });
        
        res.json({
            success: true,
            jobId: jobId,
            status: 'running',
            message: 'Thumbnail generation started'
        });
        
    } catch (error) {
        console.error('❌ Failed to start job:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to check job status
app.get('/api/generate-thumbnails', authenticate, (req, res) => {
    const { jobId } = req.query;
    
    if (!jobId) {
        // Return list of recent jobs
        const recentJobs = Array.from(jobs.values())
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, 10)
            .map(job => ({
                id: job.id,
                status: job.status,
                startTime: job.startTime,
                endTime: job.endTime,
                processed: job.processed,
                errors: job.errors,
                progress: job.progress
            }));
        
        res.json({ jobs: recentJobs });
        return;
    }
    
    const job = jobs.get(jobId);
    
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    
    // Return job status without the process object
    const jobStatus = {
        id: job.id,
        status: job.status,
        startTime: job.startTime,
        endTime: job.endTime,
        processed: job.processed,
        errors: job.errors,
        progress: job.progress,
        error: job.error,
        exitCode: job.exitCode,
        logs: job.logs.slice(-20) // Last 20 log entries
    };
    
    res.json(jobStatus);
});

// API endpoint to stop a running job
app.delete('/api/generate-thumbnails', authenticate, (req, res) => {
    const { jobId } = req.body;
    
    const job = jobs.get(jobId);
    
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    
    if (job.process && job.status === 'running') {
        job.process.kill('SIGTERM');
        job.status = 'cancelled';
        job.endTime = new Date();
        job.progress = 'Job cancelled by user';
        
        console.log(`⏹️ Job ${jobId} cancelled by user`);
        res.json({ success: true, message: 'Job cancelled' });
    } else {
        res.json({ success: false, message: 'Job is not running' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        activeJobs: jobs.size
    });
});

// Cleanup old jobs (keep last 50)
setInterval(() => {
    const allJobs = Array.from(jobs.entries())
        .sort((a, b) => new Date(b[1].startTime) - new Date(a[1].startTime));
    
    // Keep only the 50 most recent jobs
    if (allJobs.length > 50) {
        const toDelete = allJobs.slice(50);
        toDelete.forEach(([jobId]) => {
            jobs.delete(jobId);
        });
        
        if (toDelete.length > 0) {
            console.log(`🧹 Cleaned up ${toDelete.length} old jobs`);
        }
    }
}, 3600000); // Run every hour

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`📱 Mobile Thumbnail Generator Server running on port ${PORT}`);
    console.log(`🌐 Access from your phone: http://[your-computer-ip]:${PORT}`);
    console.log(`🔑 Access key: hash-thumbnails-2025`);
    console.log('');
    console.log('To find your computer\'s IP address:');
    console.log('  macOS/Linux: ifconfig | grep "inet " | grep -v 127.0.0.1');
    console.log('  Windows: ipconfig | findstr "IPv4"');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n📱 Shutting down thumbnail generator server...');
    
    // Stop all running jobs
    for (const [jobId, job] of jobs) {
        if (job.process && job.status === 'running') {
            console.log(`⏹️ Stopping job ${jobId}...`);
            job.process.kill('SIGTERM');
        }
    }
    
    process.exit(0);
});