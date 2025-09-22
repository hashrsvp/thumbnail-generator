#!/usr/bin/env node

/**
 * Webshare Proxy Setup Assistant
 * Helps you configure your Webshare credentials and test your proxies
 */

const chalk = require('chalk');
const { WebshareProxyManager } = require('./scraper/config/webshare-proxies');

async function main() {
    console.log(chalk.blue.bold('🌐 Webshare Proxy Setup Assistant'));
    console.log(chalk.gray('━'.repeat(50)));
    
    console.log(chalk.cyan('📋 Step 1: Get your Webshare credentials'));
    console.log('1. Go to https://www.webshare.io/dashboard');
    console.log('2. Navigate to "Proxy" > "Endpoint Generator"');
    console.log('3. Copy your Username and Password');
    console.log('4. Note your proxy endpoints (10 for free plan)');
    
    console.log(chalk.cyan('\\n⚙️  Step 2: Configure your credentials'));
    console.log('Set these environment variables:');
    console.log(chalk.yellow('export WEBSHARE_USERNAME="your-webshare-username"'));
    console.log(chalk.yellow('export WEBSHARE_PASSWORD="your-webshare-password"'));
    
    // Check if credentials are already set
    const username = process.env.WEBSHARE_USERNAME;
    const password = process.env.WEBSHARE_PASSWORD;
    
    if (username && password) {
        console.log(chalk.green('\\n✅ Credentials found in environment variables'));
        console.log(`Username: ${username.substring(0, 4)}...${username.substring(username.length - 4)}`);
        
        console.log(chalk.cyan('\\n🧪 Testing your proxies...'));
        
        try {
            const manager = new WebshareProxyManager({ username, password });
            const proxies = await manager.getValidatedProxies();
            
            if (proxies.length > 0) {
                console.log(chalk.green(`\\n🎉 Success! ${proxies.length} working proxies ready`));
                
                console.log(chalk.blue('\\n📖 Next steps:'));
                console.log('1. Use with your scraper:');
                console.log(chalk.cyan('   node scraper/webshare-scraper.js --url "https://eventbrite.com/..." --proxy'));
                console.log('\\n2. Test with Ticketmaster:');
                console.log(chalk.cyan('   node scraper/webshare-scraper.js --url "https://www.ticketmaster.com/..." --proxy'));
                console.log('\\n3. Batch scraping with proxy rotation:');
                console.log(chalk.cyan('   node scraper/webshare-scraper.js --batch urls.txt --proxy --rotate-every 3'));
                
            } else {
                console.log(chalk.red('❌ No working proxies found. Check your credentials and network connection.'));
            }
            
        } catch (error) {
            console.error(chalk.red(`❌ Error testing proxies: ${error.message}`));
        }
        
    } else {
        console.log(chalk.yellow('\\n⚠️  Credentials not found in environment variables'));
        console.log('\\nAdd them to your shell profile (.bashrc, .zshrc, etc.):');
        console.log(chalk.cyan('echo "export WEBSHARE_USERNAME=your-username" >> ~/.zshrc'));
        console.log(chalk.cyan('echo "export WEBSHARE_PASSWORD=your-password" >> ~/.zshrc'));
        console.log(chalk.cyan('source ~/.zshrc'));
        
        console.log('\\nOr test directly with credentials:');
        console.log(chalk.cyan('node scraper/webshare-scraper.js --test-proxies --username "your-username" --password "your-password"'));
    }
    
    console.log(chalk.gray('\\n━'.repeat(50)));
    console.log(chalk.blue('💡 Tips:'));
    console.log('• Free plan gives you 10 rotating residential proxies');
    console.log('• Proxies automatically rotate to avoid IP bans');
    console.log('• Use --rotate-every N to change proxy every N requests');
    console.log('• Perfect for scraping sites that block your IP');
}

if (require.main === module) {
    main().catch(console.error);
}