#!/usr/bin/env node

/**
 * Demo of New Scraper Features
 * 
 * Demonstrates the enterprise features now available in your upgraded scraper
 */

const EventScraper = require('./improved-event-scraper-2');
const chalk = require('chalk');

async function demoNewFeatures() {
    console.log(chalk.blue.bold('🚀 IMPROVED SCRAPER v2.0 - FEATURE DEMO'));
    console.log(chalk.gray('=' .repeat(60)));
    console.log('');

    // 1. BASIC USAGE (Same as before, but enhanced)
    console.log(chalk.cyan('📍 1. BASIC USAGE (Enhanced)'));
    console.log(chalk.gray('Same interface as before, but with intelligent caching and rate limiting'));
    
    const scraper = new EventScraper({
        headless: true,
        timeout: 30000,
        debug: true,
        // New features automatically enabled
        cacheEnabled: true,
        logLevel: 'info',
        dbPath: './data'
    });

    // 2. REAL-TIME STATISTICS
    console.log('\n' + chalk.cyan('📊 2. REAL-TIME PERFORMANCE STATS'));
    const initialStats = await scraper.getStats();
    console.log(chalk.white(`Success Rate: ${initialStats.successRate}%`));
    console.log(chalk.white(`Cache Hit Rate: ${initialStats.cacheHitRate}%`));
    console.log(chalk.white(`Total Requests: ${initialStats.totalRequests}`));
    console.log(chalk.white(`Runtime: ${initialStats.runtimeMinutes} minutes`));

    // 3. EVENT LISTENERS (Monitor activity)
    console.log('\n' + chalk.cyan('🔔 3. REAL-TIME EVENT MONITORING'));
    console.log(chalk.gray('Setting up event listeners...'));
    
    scraper.on('success', ({ url, responseTime }) => {
        console.log(chalk.green(`  ✅ Scraped in ${responseTime}ms`));
    });
    
    scraper.on('failure', ({ url, error }) => {
        console.log(chalk.red(`  ❌ Failed: ${error}`));
    });
    
    scraper.on('health', (health) => {
        console.log(chalk.blue(`  💊 Health: ${health.successRate}% success rate`));
    });

    // 4. ADVANCED CONFIGURATION DEMO
    console.log('\n' + chalk.cyan('⚙️  4. ADVANCED CONFIGURATION EXAMPLE'));
    console.log(chalk.gray('Creating enterprise-configured scraper...'));
    
    const advancedScraper = new EventScraper({
        // Anti-detection
        rotateUserAgent: true,
        rotateViewport: true,
        mimicHumanBehavior: true,
        rotateIdentityAfter: 20,
        
        // Rate limiting
        minDelay: 3000,
        maxDelay: 8000,
        dailyLimit: 500,
        
        // Performance
        concurrency: 2,
        cacheEnabled: true,
        cacheTTL: 1800000, // 30 minutes
        
        // Monitoring  
        logLevel: 'debug',
        logFile: './logs/advanced-scraper.log',
        // webhookUrl: 'https://hooks.slack.com/...' // For alerts
    });
    
    console.log(chalk.green('  ✅ Advanced scraper configured'));

    // 5. PROXY SUPPORT (Demo configuration)
    console.log('\n' + chalk.cyan('🌐 5. PROXY ROTATION SUPPORT'));
    console.log(chalk.gray('Proxy configuration example:'));
    console.log(chalk.white(`
    const proxyEnabledScraper = new EventScraper({
        proxies: [
            { server: 'proxy1.example.com:8080', username: 'user', password: 'pass' },
            { server: 'proxy2.example.com:8080', username: 'user', password: 'pass' }
        ],
        // Automatic proxy validation and rotation
    });`));

    // 6. CACHE DEMO
    console.log('\n' + chalk.cyan('💾 6. INTELLIGENT CACHING'));
    console.log(chalk.gray('Demonstrating cache behavior...'));
    
    // First request (cache miss)
    const testUrl = 'https://example.com'; // Placeholder
    console.log(chalk.yellow('  First request (cache miss) - would be slower'));
    
    // Second request (cache hit)
    console.log(chalk.green('  Second request (cache hit) - much faster'));
    console.log(chalk.gray('  Cache automatically expires after TTL'));

    // 7. ERROR RECOVERY
    console.log('\n' + chalk.cyan('🛡️  7. INTELLIGENT ERROR RECOVERY'));
    console.log(chalk.gray('Built-in error classification and recovery strategies:'));
    console.log(chalk.white('  • TIMEOUT → Retry with increased timeout'));
    console.log(chalk.white('  • CLOUDFLARE → Rotate proxy and wait'));
    console.log(chalk.white('  • RATE_LIMIT → Exponential backoff'));
    console.log(chalk.white('  • BLOCKED → Rotate identity'));
    console.log(chalk.white('  • CAPTCHA → Manual intervention alert'));

    // 8. HEALTH MONITORING
    console.log('\n' + chalk.cyan('💊 8. HEALTH MONITORING'));
    const health = await scraper.healthCheck();
    console.log(chalk.white(`  Uptime: ${health.uptime} minutes`));
    console.log(chalk.white(`  Requests: ${health.requests}`));
    console.log(chalk.white(`  Success Rate: ${health.successRate}%`));
    console.log(chalk.white(`  Cache Stats: ${health.cacheStats.total} entries`));

    // 9. DATABASE STATS
    console.log('\n' + chalk.cyan('🗄️  9. PERSISTENT DATA STORAGE'));
    console.log(chalk.gray('SQLite databases automatically created:'));
    console.log(chalk.white('  • ./data/cache.db - Response caching'));
    console.log(chalk.white('  • ./data/ratelimit.db - Rate limiting data'));
    console.log(chalk.white('  • ./logs/*.log - Detailed logging'));

    // 10. COMPATIBILITY
    console.log('\n' + chalk.cyan('🔄 10. BACKWARD COMPATIBILITY'));
    console.log(chalk.gray('Your existing code works unchanged:'));
    console.log(chalk.white(`
    // This still works exactly as before:
    const eventData = await scraper.scrapeEvent(url);
    console.log(eventData.title, eventData.venue, eventData.imageUrl);
    `));

    console.log('\n' + chalk.green.bold('✨ DEMO COMPLETE'));
    console.log(chalk.green('Your scraper now has enterprise-grade features while maintaining full compatibility!'));
    console.log('');
    console.log(chalk.gray('Key Benefits:'));
    console.log(chalk.white('• 🚀 Faster performance through caching'));
    console.log(chalk.white('• 🛡️  Better reliability with error recovery'));
    console.log(chalk.white('• 📊 Real-time monitoring and statistics'));
    console.log(chalk.white('• 🌐 Anti-detection and proxy support'));
    console.log(chalk.white('• 💾 Persistent data storage'));
    console.log(chalk.white('• 🔔 Event-driven monitoring'));

    // Cleanup
    await scraper.close();
    await advancedScraper.close();
    
    console.log('\n' + chalk.gray('🔚 Demo cleanup complete'));
}

// Handle errors
process.on('unhandledRejection', (error) => {
    console.error(chalk.red('❌ Demo error:'), error.message);
    process.exit(1);
});

// Run demo
if (require.main === module) {
    demoNewFeatures().catch(console.error);
}

module.exports = { demoNewFeatures };