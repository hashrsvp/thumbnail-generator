/**
 * Webshare Proxy Configuration
 * 
 * To set up your Webshare proxies:
 * 1. Go to your Webshare dashboard
 * 2. Copy your proxy endpoints, username, and password
 * 3. Fill in the configuration below
 */

class WebshareProxyManager {
    constructor(credentials = {}) {
        this.username = credentials.username || process.env.WEBSHARE_USERNAME;
        this.password = credentials.password || process.env.WEBSHARE_PASSWORD;
        this.endpoints = credentials.endpoints || [];
        
        if (!this.username || !this.password) {
            console.warn('⚠️  Webshare credentials not provided. Set WEBSHARE_USERNAME and WEBSHARE_PASSWORD environment variables or pass credentials to constructor.');
        }
    }
    
    /**
     * Get proxy configuration for your 10 free Webshare proxies
     * Format: [{ server: 'ip:port', username: 'user', password: 'pass' }, ...]
     */
    getProxyList() {
        if (!this.username || !this.password) {
            console.error('❌ Webshare credentials not configured');
            return [];
        }
        
        // Your actual Webshare proxy endpoints from the dashboard
        const actualEndpoints = [
            '23.95.150.145:6114',
            '198.23.239.134:6540',
            '45.38.107.97:6014',
            '107.172.163.27:6543',
            '64.137.96.74:6641',
            '45.43.186.39:6257',
            '154.203.43.247:5536',
            '216.10.27.159:6837',
            '136.0.207.84:6661',
            '142.147.128.93:6593'
        ];
        
        const endpoints = this.endpoints.length > 0 ? this.endpoints : actualEndpoints;
        
        return endpoints.map(endpoint => ({
            server: `http://${endpoint}`,
            username: this.username,
            password: this.password,
            type: 'webshare-datacenter'
        }));
    }
    
    /**
     * Test a single Webshare proxy
     */
    async testProxy(proxyConfig) {
        const { chromium } = require('playwright');
        
        try {
            const browser = await chromium.launch({
                headless: true,
                proxy: {
                    server: proxyConfig.server,
                    username: proxyConfig.username,
                    password: proxyConfig.password
                }
            });
            
            const page = await browser.newPage();
            
            // Test with IP check service
            const response = await page.goto('https://httpbin.org/ip', {
                timeout: 10000,
                waitUntil: 'domcontentloaded'
            });
            
            if (response && response.status() === 200) {
                const content = await page.textContent('pre');
                const ipData = JSON.parse(content);
                console.log(`✅ Proxy ${proxyConfig.server} working - IP: ${ipData.origin}`);
                await browser.close();
                return true;
            }
            
            await browser.close();
            return false;
            
        } catch (error) {
            console.log(`❌ Proxy ${proxyConfig.server} failed: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Validate all proxies and return working ones
     */
    async getValidatedProxies() {
        const proxies = this.getProxyList();
        const validProxies = [];
        
        console.log(`🔍 Testing ${proxies.length} Webshare proxies...`);
        
        for (const proxy of proxies) {
            const isValid = await this.testProxy(proxy);
            if (isValid) {
                validProxies.push(proxy);
            }
            
            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log(`✅ ${validProxies.length}/${proxies.length} proxies are working`);
        return validProxies;
    }
}

// Configuration templates for different Webshare plans
const WEBSHARE_CONFIGS = {
    // Free plan - 10 datacenter proxies from multiple locations
    free: {
        maxProxies: 10,
        type: 'datacenter',
        locations: ['US (Buffalo, Dallas, Orem, Ashburn)', 'UK (London)', 'Spain (Madrid)', 'Japan (Chiyoda City)'],
        endpoints: [
            '23.95.150.145:6114',    // US - Buffalo
            '198.23.239.134:6540',   // US - Buffalo
            '45.38.107.97:6014',     // UK - London
            '107.172.163.27:6543',   // US - Bloomingdale
            '64.137.96.74:6641',     // Spain - Madrid
            '45.43.186.39:6257',     // Spain - Madrid
            '154.203.43.247:5536',   // Japan - Chiyoda City
            '216.10.27.159:6837',    // US - Dallas
            '136.0.207.84:6661',     // US - Orem
            '142.147.128.93:6593'    // US - Ashburn
        ]
    }
};

module.exports = {
    WebshareProxyManager,
    WEBSHARE_CONFIGS
};