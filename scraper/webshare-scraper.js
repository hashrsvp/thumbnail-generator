#!/usr/bin/env node

/**
 * Enhanced Event Scraper with Webshare Proxy Integration
 * 
 * Usage:
 *   node webshare-scraper.js --url "https://eventbrite.com/..." --proxy
 *   node webshare-scraper.js --test-proxies
 *   node webshare-scraper.js --batch urls.txt --proxy --rotate-every 3
 */

const { program } = require('commander');
const chalk = require('chalk');
const EventScraper = require('./improved-event-scraper-2');
const { WebshareProxyManager } = require('./config/webshare-proxies');

class WebshareEnabledScraper extends EventScraper {
    constructor(options = {}) {
        super(options);
        this.webshareManager = null;
        this.proxyRotationCount = 0;
        this.rotateEveryN = options.rotateEveryN || 5; // Rotate proxy every N requests
    }
    
    async initializeWebshareProxies(credentials = {}) {
        console.log(chalk.blue('🔄 Initializing Webshare proxies...'));
        
        this.webshareManager = new WebshareProxyManager(credentials);
        const validProxies = await this.webshareManager.getValidatedProxies();
        
        if (validProxies.length === 0) {
            console.warn(chalk.yellow('⚠️  No working Webshare proxies found. Running without proxies.'));
            return false;
        }
        
        // Update the existing ProxyRotator with Webshare proxies
        this.proxyRotator.proxies = validProxies;
        this.proxyRotator.enabled = true;
        
        console.log(chalk.green(`✅ ${validProxies.length} Webshare proxies ready for rotation`));
        return true;
    }
    
    async scrapeEvent(url) {
        // Rotate proxy every N requests to avoid detection
        if (this.proxyRotationCount >= this.rotateEveryN && this.proxyRotator.enabled) {
            console.log(chalk.cyan('🔄 Rotating proxy...'));
            await this.rotateIdentity(); // This will get a new proxy
            this.proxyRotationCount = 0;
        }
        
        try {
            const result = await super.scrapeEvent(url);
            this.proxyRotationCount++;
            return result;
        } catch (error) {
            // If scraping fails, try with a different proxy
            if (error.message.includes('Blocked') && this.proxyRotator.enabled) {
                console.log(chalk.yellow('🔄 Request blocked, trying with different proxy...'));
                await this.rotateIdentity();
                return await super.scrapeEvent(url);
            }
            throw error;
        }
    }
}

async function main() {
    program
        .name('webshare-scraper')
        .description('Event scraper with Webshare proxy integration')
        .version('1.0.0');
    
    program
        .option('-u, --url <url>', 'URL to scrape')
        .option('--proxy', 'Enable Webshare proxy rotation')
        .option('--test-proxies', 'Test all Webshare proxies')
        .option('--rotate-every <n>', 'Rotate proxy every N requests', '5')
        .option('--username <user>', 'Webshare username')
        .option('--password <pass>', 'Webshare password')
        .option('-v, --verbose', 'Verbose logging')
        .option('--dry-run', 'Don\'t submit to Firebase');
    
    program.parse();
    const options = program.opts();
    
    // Show banner
    console.log(chalk.blue.bold('\\n🚀 Webshare-Enabled Event Scraper'));
    console.log(chalk.gray('━'.repeat(50)));
    
    if (options.testProxies) {
        console.log(chalk.cyan('🧪 Testing Webshare proxies...\\n'));
        
        const credentials = {
            username: options.username || process.env.WEBSHARE_USERNAME,
            password: options.password || process.env.WEBSHARE_PASSWORD
        };
        
        const manager = new WebshareProxyManager(credentials);
        const validProxies = await manager.getValidatedProxies();
        
        console.log(chalk.green(`\\n✅ ${validProxies.length} proxies are working and ready to use!`));
        
        if (validProxies.length > 0) {
            console.log(chalk.blue('\\n📋 Working proxies:'));
            validProxies.forEach((proxy, index) => {
                console.log(chalk.gray(`   ${index + 1}. ${proxy.server}`));
            });
        }
        
        return;
    }
    
    if (!options.url) {
        program.help();
        return;
    }
    
    // Initialize scraper
    const scraperOptions = {
        headless: true,
        timeout: 30000,
        rotateEveryN: parseInt(options.rotateEvery),
        retries: 3
    };
    
    const scraper = new WebshareEnabledScraper(scraperOptions);
    
    try {
        // Initialize Webshare proxies if requested
        if (options.proxy) {
            const credentials = {
                username: options.username || process.env.WEBSHARE_USERNAME,
                password: options.password || process.env.WEBSHARE_PASSWORD
            };
            
            const proxySuccess = await scraper.initializeWebshareProxies(credentials);
            if (!proxySuccess) {
                console.log(chalk.yellow('⚠️  Continuing without proxies...'));
            }
        }
        
        // Scrape the event
        console.log(chalk.cyan(`\\n🔍 Scraping: ${options.url}`));
        
        const result = await scraper.scrapeEvent(options.url);
        
        // Show results
        console.log(chalk.green('\\n✅ Scraping successful!'));
        console.log(chalk.blue('📋 Event Details:'));
        console.log(chalk.gray('━'.repeat(40)));
        console.log(`Title: ${result.title}`);
        console.log(`Venue: ${result.venue}`);
        console.log(`Date: ${result.date}`);
        console.log(`Free: ${result.free ? 'Yes' : 'No'}`);
        console.log(`Address: ${result.address}`);
        
        if (result.imageUrl) {
            console.log(`Image: ${result.imageUrl}`);
        }
        
        console.log(chalk.gray('━'.repeat(40)));
        
        if (options.dryRun) {
            console.log(chalk.yellow('🔍 DRY RUN - Event not submitted to Firebase'));
        } else {
            console.log(chalk.cyan('💾 Event ready for Firebase submission'));
        }
        
    } catch (error) {
        console.error(chalk.red(`❌ Scraping failed: ${error.message}`));
        
        if (options.verbose) {
            console.error(chalk.gray(error.stack));
        }
    } finally {
        await scraper.closeBrowser();
    }
}

// Setup instructions
function showSetupInstructions() {
    console.log(chalk.blue('\\n📖 Webshare Setup Instructions:'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log('1. Go to your Webshare dashboard');
    console.log('2. Copy your username and password');  
    console.log('3. Set environment variables:');
    console.log(chalk.cyan('   export WEBSHARE_USERNAME="your-username"'));
    console.log(chalk.cyan('   export WEBSHARE_PASSWORD="your-password"'));
    console.log('\\n4. Or pass credentials directly:');
    console.log(chalk.cyan('   --username "your-username" --password "your-password"'));
    console.log('\\n5. Test your proxies:');
    console.log(chalk.cyan('   node webshare-scraper.js --test-proxies'));
    console.log(chalk.gray('━'.repeat(50)));
}

// Check if credentials are available
if (!process.env.WEBSHARE_USERNAME && process.argv.includes('--proxy')) {
    showSetupInstructions();
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(chalk.red('💥 Fatal error:'), error);
        process.exit(1);
    });
}

module.exports = WebshareEnabledScraper;