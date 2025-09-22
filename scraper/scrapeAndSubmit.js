#!/usr/bin/env node

/**
 * Hash Event Scraper - CLI Interface
 * 
 * Main command-line interface for scraping events and submitting them
 * directly to Firebase with exact schema validation.
 * 
 * Usage:
 *   node scrapeAndSubmit.js --url "https://eventbrite.com/..."
 *   node scrapeAndSubmit.js --batch urls.txt --dry-run
 *   node scrapeAndSubmit.js --test
 */

const { program } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const ora = require('ora');

const EventScraper = require('./improved-event-scraper-2');
const FirebaseService = require('./firebaseService');
const ImageHandler = require('./utils/imageHandler');

class ScrapeCLI {
    constructor() {
        this.scraper = new EventScraper();
        this.firebase = new FirebaseService();
        this.imageHandler = new ImageHandler();
        
        this.setupProgram();
    }
    
    setupProgram() {
        program
            .name('scrapeAndSubmit')
            .description('Hash Event Scraper - Extract and submit events to Firebase')
            .version('1.0.0');
        
        // Single URL scraping
        program
            .option('-u, --url <url>', 'URL to scrape')
            .option('-d, --dry-run', 'Preview data without submitting to Firebase')
            .option('-s, --submit', 'Submit to Firebase (default behavior)')
            .option('--no-images', 'Skip image processing')
            .option('--allow-duplicates', 'Allow duplicate events')
            .option('-v, --verbose', 'Verbose logging')
            .option('--collection <name>', 'Force specific collection (bayAreaEvents/austinEvents)');
        
        // Batch processing
        program
            .option('-b, --batch <file>', 'File with URLs to scrape (one per line)')
            .option('--batch-size <number>', 'Process in batches of N URLs', '5')
            .option('--delay <ms>', 'Delay between requests in milliseconds', '2000');
        
        // Testing
        program
            .option('-t, --test', 'Run test scrape without submitting');
        
        // Debug options
        program
            .option('--debug', 'Debug mode with detailed logs')
            .option('--headless <boolean>', 'Run browser in headless mode', 'true');
    }
    
    async run() {
        program.parse();
        const options = program.opts();
        
        // Show banner
        this.showBanner();
        
        try {
            // Initialize Firebase
            console.log(chalk.cyan('🔥 Initializing Firebase...'));
            const firebaseReady = await this.firebase.initialize();
            if (!firebaseReady) {
                console.error(chalk.red('❌ Cannot proceed without Firebase connection'));
                process.exit(1);
            }
            
            // Route to appropriate handler
            if (options.test) {
                await this.runTest();
            } else if (options.batch) {
                await this.runBatch(options);
            } else if (options.url) {
                await this.runSingle(options);
            } else {
                program.help();
            }
            
        } catch (error) {
            console.error(chalk.red('💥 Fatal error:'), error.message);
            if (options.debug) {
                console.error(error.stack);
            }
            process.exit(1);
        } finally {
            await this.scraper.closeBrowser();
        }
    }
    
    showBanner() {
        console.log(chalk.blue.bold('\n🚀 Hash Event Scraper v1.0.0'));
        console.log(chalk.gray('━'.repeat(50)));
        console.log(chalk.cyan('Extract events from websites → Submit to Firebase'));
        console.log(chalk.gray('━'.repeat(50) + '\n'));
    }
    
    async runSingle(options) {
        const spinner = ora('Scraping event...').start();
        
        try {
            // Scrape event data
            spinner.text = 'Extracting event data...';
            const eventData = await this.scraper.scrapeEvent(options.url);
            spinner.succeed(`Event scraped: "${eventData.title}"`);
            
            // Debug image selection if verbose
            if (options.verbose && eventData.imageUrl) {
                await this.debugImageSelection(eventData, options);
            }
            
            // Show preview
            this.showEventPreview(eventData);
            
            if (options.dryRun) {
                console.log(chalk.yellow('🔍 DRY RUN - Event not submitted to Firebase'));
                return;
            }
            
            // Validate and submit to Firebase
            spinner.start('Validating event data...');
            const validation = this.firebase.validateEventData(eventData);
            
            if (!validation.valid) {
                spinner.fail('Event validation failed');
                console.error(chalk.red('❌ Validation errors:'));
                validation.errors.forEach(error => {
                    console.error(chalk.red(`   • ${error}`));
                });
                return;
            }
            
            spinner.text = 'Submitting to Firebase...';
            const submitResult = await this.firebase.submitEvent(eventData, {
                allowDuplicates: options.allowDuplicates
            });
            
            if (submitResult.success) {
                spinner.succeed(`Event submitted successfully!`);
                console.log(chalk.green(`📄 Event ID: ${submitResult.eventId}`));
                console.log(chalk.gray(`📂 Collection: ${submitResult.collection}`));
                
                // Process image if available and not disabled
                if (eventData.imageUrl && !options.noImages) {
                    await this.processEventImage(eventData.imageUrl, submitResult.eventId);
                }
                
            } else if (submitResult.duplicate) {
                spinner.warn('Event already exists');
                console.log(chalk.yellow('🔄 Duplicate event found:'));
                console.log(chalk.gray(`   Collection: ${submitResult.existing.collection}`));
                console.log(chalk.gray(`   ID: ${submitResult.existing.id}`));
                
            } else {
                spinner.fail('Submission failed');
            }
            
        } catch (error) {
            spinner.fail('Scraping failed');
            console.error(chalk.red(`❌ Error: ${error.message}`));
            
            if (options.debug) {
                console.error(chalk.gray(error.stack));
            }
        }
    }
    
    async runBatch(options) {
        if (!fs.existsSync(options.batch)) {
            console.error(chalk.red(`❌ Batch file not found: ${options.batch}`));
            return;
        }
        
        const urls = fs.readFileSync(options.batch, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));
        
        if (urls.length === 0) {
            console.error(chalk.red('❌ No valid URLs found in batch file'));
            return;
        }
        
        console.log(chalk.blue(`📋 Processing ${urls.length} URLs from ${options.batch}`));
        
        const results = {
            successful: [],
            failed: [],
            duplicates: [],
            total: urls.length
        };
        
        const batchSize = parseInt(options.batchSize);
        const delay = parseInt(options.delay);
        
        // Process in batches
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(urls.length / batchSize);
            
            console.log(chalk.cyan(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} URLs)`));
            
            for (let j = 0; j < batch.length; j++) {
                const url = batch[j];
                const overallIndex = i + j + 1;
                
                const spinner = ora(`[${overallIndex}/${urls.length}] ${url}`).start();
                
                try {
                    // Scrape event
                    const eventData = await this.scraper.scrapeEvent(url);
                    spinner.text = `Processing: ${eventData.title}`;
                    
                    if (!options.dryRun) {
                        // Submit to Firebase
                        const submitResult = await this.firebase.submitEvent(eventData, {
                            allowDuplicates: options.allowDuplicates
                        });
                        
                        if (submitResult.success) {
                            spinner.succeed(`✅ ${eventData.title}`);
                            results.successful.push({
                                url: url,
                                title: eventData.title,
                                eventId: submitResult.eventId,
                                collection: submitResult.collection
                            });
                            
                            // Process image if available
                            if (eventData.imageUrl && !options.noImages) {
                                await this.processEventImage(eventData.imageUrl, submitResult.eventId);
                            }
                            
                        } else if (submitResult.duplicate) {
                            spinner.warn(`🔄 ${eventData.title} (duplicate)`);
                            results.duplicates.push({
                                url: url,
                                title: eventData.title,
                                existing: submitResult.existing
                            });
                            
                        } else {
                            spinner.fail(`❌ ${eventData.title} (submit failed)`);
                            results.failed.push({
                                url: url,
                                title: eventData.title,
                                error: 'Submit failed'
                            });
                        }
                    } else {
                        spinner.succeed(`👁️  ${eventData.title} (dry run)`);
                        results.successful.push({
                            url: url,
                            title: eventData.title,
                            dryRun: true
                        });
                    }
                    
                } catch (error) {
                    spinner.fail(`❌ ${url.substring(0, 50)}...`);
                    results.failed.push({
                        url: url,
                        error: error.message
                    });
                }
                
                // Add delay between requests
                if (j < batch.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        // Show final results
        this.showBatchResults(results, options.dryRun);
    }
    
    async runTest() {
        console.log(chalk.blue('🧪 Running test scrape...\n'));
        
        // Test with a known Eventbrite URL (or create a test case)
        const testUrl = 'https://www.eventbrite.com/e/test-event'; // Would need real URL for testing
        
        console.log(chalk.gray('This would test scraping functionality with a known good URL.'));
        console.log(chalk.gray('For now, run with a real URL using: --url "https://eventbrite.com/..."'));
    }
    
    async debugImageSelection(eventData, options) {
        console.log(chalk.blue('\n🔍 Image Selection Debug Mode'));
        console.log(chalk.gray('━'.repeat(50)));
        
        // Check if we have multiple images to analyze
        const rawData = eventData._rawData || eventData;
        
        if (rawData.imageUrls && rawData.imageUrls.length > 1) {
            console.log(chalk.cyan(`📷 Found ${rawData.imageUrls.length} image candidates`));
            
            // Use the ImageSelector debug method
            await this.scraper.imageSelector.debugImageSelection(
                rawData.imageUrls,
                rawData.title || '',
                rawData.venue || ''
            );
        } else {
            console.log(chalk.yellow('ℹ️  Only one image candidate found, no selection needed'));
            if (eventData.imageUrl) {
                console.log(chalk.gray(`   Using: ${eventData.imageUrl}`));
            }
        }
        
        console.log(chalk.gray('━'.repeat(50)));
    }
    
    showEventPreview(eventData) {
        console.log(chalk.blue('\n📋 Event Preview:'));
        console.log(chalk.gray('━'.repeat(40)));
        
        const fields = [
            ['Title', eventData.title],
            ['Venue', eventData.venue],
            ['Address', eventData.address],
            ['Date', eventData.date],
            ['Start Time', eventData.startTime],
            ['Categories', Array.isArray(eventData.categories) ? eventData.categories.join(', ') : ''],
            ['Free', eventData.free ? 'Yes' : 'No'],
            ['Sold Out', eventData.soldOutStatus ? 'Yes' : 'No'],
            ['Tickets Link', eventData.ticketsLink],
            ['Description', eventData.description ? eventData.description.substring(0, 100) + '...' : ''],
            ['Image URL', eventData.imageUrl || 'None']
        ];
        
        fields.forEach(([label, value]) => {
            if (value) {
                console.log(chalk.cyan(`${label.padEnd(12)}: `) + chalk.white(value));
            }
        });
        
        console.log(chalk.gray('━'.repeat(40)));
    }
    
    showBatchResults(results, isDryRun) {
        console.log(chalk.blue('\n📊 Batch Processing Results:'));
        console.log(chalk.gray('━'.repeat(50)));
        
        console.log(chalk.green(`✅ Successful: ${results.successful.length}`));
        console.log(chalk.yellow(`🔄 Duplicates: ${results.duplicates.length}`));
        console.log(chalk.red(`❌ Failed: ${results.failed.length}`));
        console.log(chalk.cyan(`📋 Total: ${results.total}`));
        
        if (results.successful.length > 0) {
            console.log(chalk.green('\n✅ Successfully processed:'));
            results.successful.slice(0, 5).forEach(item => {
                console.log(chalk.gray(`   • ${item.title}`));
            });
            if (results.successful.length > 5) {
                console.log(chalk.gray(`   ... and ${results.successful.length - 5} more`));
            }
        }
        
        if (results.failed.length > 0) {
            console.log(chalk.red('\n❌ Failed to process:'));
            results.failed.slice(0, 5).forEach(item => {
                console.log(chalk.gray(`   • ${item.url}: ${item.error}`));
            });
            if (results.failed.length > 5) {
                console.log(chalk.gray(`   ... and ${results.failed.length - 5} more`));
            }
        }
        
        console.log(chalk.gray('━'.repeat(50)));
        
        if (isDryRun) {
            console.log(chalk.yellow('🔍 DRY RUN - No events were submitted to Firebase'));
        }
    }
    
    async processEventImage(imageUrl, eventId) {
        const spinner = ora('Processing event image...').start();
        
        try {
            const imageResult = await this.imageHandler.processEventImage(imageUrl, eventId);
            
            if (imageResult.success) {
                spinner.succeed(`Image uploaded for event ${eventId}`);
            } else {
                spinner.warn(`Image processing failed: ${imageResult.error}`);
            }
            
        } catch (error) {
            spinner.fail(`Image processing error: ${error.message}`);
        }
    }
}

// Run CLI if called directly
if (require.main === module) {
    const cli = new ScrapeCLI();
    cli.run().catch(error => {
        console.error(chalk.red('💥 Unhandled error:'), error);
        process.exit(1);
    });
}

module.exports = ScrapeCLI;