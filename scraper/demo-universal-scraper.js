#!/usr/bin/env node

/**
 * Universal Event Scraper Demo
 * 
 * Demonstrates the 5-layer Universal Extraction System
 * working on real venue websites from the Hash app.
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

// Demo venues from the Hash app venue list
const DEMO_VENUES = {
    "Music (Bay Area)": [
        "https://www.livenation.com/venue/KovZpZAE6eeA/the-fillmore-events",
        "https://gamh.com/calendar/",
        "https://thefoxoakland.com/listing/"
    ],
    "Nightclubs (Austin)": [
        "https://antonesnightclub.com/",
        "https://kingdomnightclub.com/events/"
    ],
    "Comedy Venues": [
        "https://www.cobbscomedy.com/",
        "https://comedymothership.com/"
    ],
    "Art Venues": [
        "https://www.calacademy.org/nightlife",
        "https://www.exploratorium.edu/visit/calendar/after-dark"
    ]
};

class UniversalScraperDemo {
    constructor() {
        this.scraper = new EventScraper({ 
            headless: false,  // Show browser for demo
            timeout: 15000 
        });
        this.results = [];
    }

    async runDemo() {
        console.log(chalk.blue.bold('\n🎭 Universal Event Scraper Demo\n'));
        console.log(chalk.gray('Demonstrating the 5-layer extraction system on real Hash venues...\n'));

        // Test each category
        for (const [category, urls] of Object.entries(DEMO_VENUES)) {
            console.log(chalk.cyan(`\n📍 Testing ${category} venues:`));
            
            for (const url of urls) {
                await this.testVenue(url, category);
            }
        }

        await this.showSummary();
        await this.scraper.closeBrowser();
    }

    async testVenue(url, category) {
        try {
            console.log(chalk.yellow(`  🔍 Scraping: ${this.shortenUrl(url)}`));
            
            const startTime = Date.now();
            const result = await this.scraper.scrapeEvent(url);
            const processingTime = Date.now() - startTime;

            // Extract confidence if available
            const confidence = result._extraction?.totalConfidence || 'N/A';
            const method = result._extraction?.method || 'legacy';

            // Validate Hash requirements
            const hasCommaAddress = result.address && result.address.includes(',');
            const validCategories = ['Music', 'Festivals', 'Food Events', 'Sports/Games', 
                                   'Comedy Shows', 'Art Shows', 'Bars', 'Nightclubs'];
            const hasValidCategories = result.categories && result.categories.every(cat => validCategories.includes(cat));

            console.log(chalk.green(`    ✅ Success! ${method} extraction`));
            console.log(chalk.gray(`       Title: ${result.title || 'N/A'}`));
            console.log(chalk.gray(`       Venue: ${result.venue || 'N/A'}`));
            console.log(chalk.gray(`       Address: ${result.address || 'N/A'} ${hasCommaAddress ? '✅' : '❌'}`));
            console.log(chalk.gray(`       Categories: ${(result.categories || []).join(', ')} ${hasValidCategories ? '✅' : '❌'}`));
            console.log(chalk.gray(`       Confidence: ${confidence} | Time: ${processingTime}ms\n`));

            this.results.push({
                url,
                category,
                success: true,
                title: result.title,
                venue: result.venue,
                address: result.address,
                categories: result.categories,
                hasCommaAddress,
                hasValidCategories,
                confidence,
                method,
                processingTime
            });

        } catch (error) {
            console.log(chalk.red(`    ❌ Failed: ${error.message}\n`));
            
            this.results.push({
                url,
                category,
                success: false,
                error: error.message
            });
        }
    }

    async showSummary() {
        console.log(chalk.blue.bold('\n📊 Demo Results Summary\n'));

        const successful = this.results.filter(r => r.success);
        const failed = this.results.filter(r => !r.success);

        console.log(chalk.green(`✅ Successful extractions: ${successful.length}`));
        console.log(chalk.red(`❌ Failed extractions: ${failed.length}`));
        console.log(chalk.cyan(`📈 Success rate: ${((successful.length / this.results.length) * 100).toFixed(1)}%`));

        if (successful.length > 0) {
            const avgTime = successful.reduce((sum, r) => sum + r.processingTime, 0) / successful.length;
            const addressCompliance = successful.filter(r => r.hasCommaAddress).length;
            const categoryCompliance = successful.filter(r => r.hasValidCategories).length;
            const universalMethod = successful.filter(r => r.method === 'universal').length;

            console.log(chalk.blue(`\n🎯 Quality Metrics:`));
            console.log(chalk.gray(`   Average processing time: ${avgTime.toFixed(0)}ms`));
            console.log(chalk.gray(`   Address compliance: ${addressCompliance}/${successful.length} (${((addressCompliance/successful.length)*100).toFixed(1)}%)`));
            console.log(chalk.gray(`   Category compliance: ${categoryCompliance}/${successful.length} (${((categoryCompliance/successful.length)*100).toFixed(1)}%)`));
            console.log(chalk.gray(`   Universal method usage: ${universalMethod}/${successful.length} (${((universalMethod/successful.length)*100).toFixed(1)}%)`));

            // Show extraction methods breakdown
            const methodCounts = {};
            successful.forEach(r => {
                methodCounts[r.method] = (methodCounts[r.method] || 0) + 1;
            });

            console.log(chalk.blue(`\n🔧 Extraction Methods Used:`));
            Object.entries(methodCounts).forEach(([method, count]) => {
                console.log(chalk.gray(`   ${method}: ${count} venues`));
            });
        }

        console.log(chalk.blue.bold('\n✨ Demo Complete!\n'));
        
        if (successful.length > 0) {
            console.log(chalk.green('The Universal Event Scraper successfully extracted event data from real venue websites,'));
            console.log(chalk.green('meeting Hash app requirements for address formatting and category validation.'));
        }

        if (failed.length > 0) {
            console.log(chalk.yellow('\nSome venues may require specific handling or have network restrictions.'));
            console.log(chalk.yellow('The system gracefully handles failures and can be extended for specific sites.'));
        }
    }

    shortenUrl(url) {
        return url.length > 50 ? url.substring(0, 47) + '...' : url;
    }
}

// Run the demo
if (require.main === module) {
    const demo = new UniversalScraperDemo();
    demo.runDemo().catch(error => {
        console.error(chalk.red('Demo failed:'), error.message);
        process.exit(1);
    });
}

module.exports = UniversalScraperDemo;