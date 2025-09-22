#!/usr/bin/env node

/**
 * Event Scraper for Hash App
 * 
 * Main scraping engine that extracts event data from various websites
 * and formats it for the Hash Firebase schema.
 */

const { chromium } = require('playwright');
const axios = require('axios');
const cheerio = require('cheerio');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

const FirebaseService = require('./firebaseService');
const LocationUtils = require('./utils/locationUtils');
const CategoryMapper = require('./utils/categoryMapper');
const ImageSelector = require('./utils/imageSelector');

// New Universal Extraction System utilities
const UniversalExtractor = require('./utils/universalExtractor');
const UniversalDateTimeParser = require('./utils/dateTimeParser');
const VenueExtractor = require('./utils/venueExtractor');
const { DataValidator } = require('./utils/dataValidator');

class EventScraper {
    constructor(options = {}) {
        this.options = {
            headless: options.headless !== false, // Default to headless
            timeout: options.timeout || 30000,
            userAgent: options.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            delay: options.delay || 1000, // Default delay between requests
            retries: options.retries || 3,
            // Performance optimizations
            maxEventsBatch: options.maxEventsBatch || 10, // Limit batch processing
            enableEarlyTermination: options.enableEarlyTermination !== false,
            skipAddressEnhancement: options.skipAddressEnhancement || false,
            imageTimeout: options.imageTimeout || 1000, // Reduced image timeout
            ...options
        };
        
        this.browser = null;
        this.page = null;
        
        // Initialize utilities
        this.firebase = new FirebaseService();
        this.locationUtils = new LocationUtils();
        this.categoryMapper = new CategoryMapper();
        this.imageSelector = new ImageSelector();
        
        // Initialize Universal Extraction System utilities
        this.dateTimeParser = new UniversalDateTimeParser();
        this.venueExtractor = new VenueExtractor();
        this.dataValidator = new DataValidator();
        
        // Load scraper configurations
        this.configs = this.loadConfigs();
    }
    
    /**
     * Load website-specific scraper configurations
     */
    loadConfigs() {
        const configPath = path.join(__dirname, 'config');
        const configs = {};
        
        try {
            // Load all JSON config files
            if (fs.existsSync(configPath)) {
                const files = fs.readdirSync(configPath).filter(f => f.endsWith('.json'));
                
                for (const file of files) {
                    const siteName = path.basename(file, '.json');
                    configs[siteName] = require(path.join(configPath, file));
                }
            }
        } catch (error) {
            console.warn(chalk.yellow('⚠️  Warning: Could not load scraper configs:', error.message));
        }
        
        return configs;
    }
    
    /**
     * Initialize browser for scraping
     */
    async initBrowser() {
        if (this.browser) return;
        
        try {
            this.browser = await chromium.launch({
                headless: this.options.headless,
                args: [
                    '--no-sandbox', 
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });
            
            this.page = await this.browser.newPage({
                userAgent: this.options.userAgent,
                viewport: { width: 1280, height: 720 }
            });
            
            // Set reasonable timeouts
            this.page.setDefaultTimeout(this.options.timeout);
            
            // Handle pop-ups and dialogs
            this.page.on('dialog', async dialog => {
                await dialog.dismiss();
            });
            
            // Set extra HTTP headers to appear more like a regular browser
            await this.page.setExtraHTTPHeaders({
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            });
            
            console.log(chalk.green('✅ Browser initialized'));
            
        } catch (error) {
            console.error(chalk.red('❌ Browser initialization failed:'), error.message);
            throw error;
        }
    }
    
    /**
     * Close browser
     */
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log(chalk.gray('🔒 Browser closed'));
        }
    }
    
    /**
     * Alias for closeBrowser() for convenience
     */
    async close() {
        return await this.closeBrowser();
    }
    
    /**
     * Detect website type from URL
     */
    detectSiteType(url) {
        const hostname = new URL(url).hostname.toLowerCase();
        
        if (hostname.includes('eventbrite')) return 'eventbrite';
        if (hostname.includes('ticketmaster')) return 'ticketmaster';
        if (hostname.includes('facebook') || hostname.includes('fb.me')) return 'facebook';
        if (hostname.includes('meetup')) return 'meetup';
        if (hostname.includes('do512')) return 'do512';
        if (hostname.includes('sfstation')) return 'sfstation';
        if (hostname.includes('funcheap')) return 'funcheap';
        
        return 'generic';
    }
    
    /**
     * Scrape event from URL
     */
    async scrapeEvent(url) {
        console.log(chalk.blue(`🔍 Scraping event: ${url}`));
        
        try {
            await this.initBrowser();
            
            const siteType = this.detectSiteType(url);
            console.log(chalk.cyan(`🌐 Detected site type: ${siteType}`));
            
            // Get site-specific configuration
            const config = this.configs[siteType] || this.configs.generic || {};
            
            // Navigate to page
            await this.page.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: this.options.timeout 
            });
            
            // Wait for site-specific content to load
            if (config.waitForSelector) {
                try {
                    await this.page.waitForSelector(config.waitForSelector, { 
                        timeout: 15000 
                    });
                } catch (waitError) {
                    console.log(chalk.yellow('⚠️  Wait selector failed, continuing with extraction'));
                }
            }
            
            // Additional wait for JavaScript content to load
            await this.page.waitForTimeout(3000);
            
            // Extract event data based on site type
            let eventData;
            
            switch (siteType) {
                case 'eventbrite':
                    eventData = await this.scrapeEventbrite();
                    break;
                case 'ticketmaster':
                    eventData = await this.scrapeTicketmaster();
                    break;
                case 'facebook':
                    eventData = await this.scrapeFacebook();
                    break;
                default:
                    eventData = await this.scrapeGeneric(config);
                    break;
            }
            
            // Add metadata
            eventData.sourceUrl = url;
            eventData.scrapedAt = new Date().toISOString();
            eventData.siteType = siteType;
            
            // Process and validate data
            const processedData = await this.processEventData(eventData);
            
            console.log(chalk.green(`✅ Successfully scraped: "${processedData.title}"`));
            
            return processedData;
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to scrape ${url}:`), error.message);
            throw error;
        }
    }
    
    /**
     * Scrape Eventbrite events
     */
    async scrapeEventbrite() {
        try {
            let data = {};
            console.log(chalk.blue('🎯 DEBUG: Starting Eventbrite scraping...'));
            
            // Primary Strategy: Try JSON-LD structured data first
            try {
                console.log(chalk.blue('🎯 DEBUG: Attempting JSON-LD extraction...'));
                const jsonLdData = await this.extractJsonLdData();
                if (jsonLdData && Object.keys(jsonLdData).length > 0) {
                    console.log(chalk.cyan('📊 Using JSON-LD structured data'));
                    console.log(chalk.blue('🎯 DEBUG: JSON-LD data keys:', Object.keys(jsonLdData)));
                    data = { ...data, ...jsonLdData };
                    console.log(chalk.blue('🎯 DEBUG: Data after JSON-LD merge:', {
                        hasTitle: !!data.title,
                        hasImageUrls: !!data.imageUrls,
                        imageUrlsLength: data.imageUrls ? data.imageUrls.length : 0
                    }));
                } else {
                    console.log(chalk.yellow('⚠️  No JSON-LD data extracted'));
                }
            } catch (jsonError) {
                console.log(chalk.yellow('⚠️  JSON-LD extraction failed:'), jsonError.message);
            }
            
            // Fallback Strategy: CSS Selectors for missing data
            console.log(chalk.blue('🎯 DEBUG: Filling missing data with CSS selectors...'));
            await this.fillMissingDataWithSelectors(data);
            console.log(chalk.blue('🎯 DEBUG: Data after CSS selectors:', {
                hasTitle: !!data.title,
                hasImageUrls: !!data.imageUrls,
                imageUrlsLength: data.imageUrls ? data.imageUrls.length : 0
            }));
            
            // Multiple Image Extraction (Enhanced)
            console.log(chalk.blue('🎯 DEBUG: Checking if need to extract images...'));
            console.log(chalk.blue(`🎯 DEBUG: Current imageUrls: ${data.imageUrls ? JSON.stringify(data.imageUrls) : 'null'}`));
            
            if (!data.imageUrls || data.imageUrls.length === 0) {
                console.log(chalk.blue('🎯 DEBUG: No images found yet, extracting from page...'));
                data.imageUrls = await this.extractEventbriteImages();
                console.log(chalk.blue(`🎯 DEBUG: Extracted ${data.imageUrls ? data.imageUrls.length : 0} images from page`));
            } else {
                console.log(chalk.blue(`🎯 DEBUG: Already have ${data.imageUrls.length} images, skipping extraction`));
            }
            
            // Tickets link (use the current URL)
            if (!data.ticketsLink) {
                data.ticketsLink = this.page.url();
            }
            
            console.log(chalk.blue('🎯 DEBUG: Final Eventbrite data:', {
                title: data.title,
                hasImageUrls: !!data.imageUrls,
                imageUrlsLength: data.imageUrls ? data.imageUrls.length : 0,
                firstImageUrl: data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls[0] : 'none'
            }));
            
            return data;
            
        } catch (error) {
            console.error(chalk.red('❌ Eventbrite scraping error:'), error.message);
            return {};
        }
    }
    
    /**
     * Extract structured data from JSON-LD script tags
     */
    async extractJsonLdData() {
        try {
            console.log(chalk.blue('🔍 DEBUG: Starting JSON-LD extraction...'));
            const jsonLdScripts = await this.page.locator('script[type="application/ld+json"]').all();
            console.log(chalk.blue(`🔍 DEBUG: Found ${jsonLdScripts.length} JSON-LD script tags`));
            
            for (let i = 0; i < jsonLdScripts.length; i++) {
                const script = jsonLdScripts[i];
                const content = await script.textContent();
                if (!content) {
                    console.log(chalk.yellow(`🔍 DEBUG: Script ${i + 1} has no content`));
                    continue;
                }
                
                console.log(chalk.blue(`🔍 DEBUG: Processing script ${i + 1}, content length: ${content.length}`));
                
                try {
                    const jsonData = JSON.parse(content);
                    console.log(chalk.blue(`🔍 DEBUG: Parsed JSON data type: ${typeof jsonData}, isArray: ${Array.isArray(jsonData)}`));
                    
                    if (Array.isArray(jsonData)) {
                        console.log(chalk.blue(`🔍 DEBUG: Array contains ${jsonData.length} items`));
                        jsonData.forEach((item, idx) => {
                            console.log(chalk.blue(`🔍 DEBUG: Item ${idx}: @type = ${item['@type']}`));
                        });
                    } else {
                        console.log(chalk.blue(`🔍 DEBUG: Single object @type = ${jsonData['@type']}`));
                    }
                    
                    // Handle array of structured data - look for Event, SocialEvent, or embedded event data
                    let eventData = null;
                    
                    if (Array.isArray(jsonData)) {
                        eventData = jsonData.find(item => 
                            item['@type'] === 'SocialEvent' || 
                            item['@type'] === 'Event' ||
                            item['@type'] === 'EventSeries'
                        );
                    } else if (jsonData['@type'] === 'SocialEvent' || jsonData['@type'] === 'Event' || jsonData['@type'] === 'EventSeries') {
                        eventData = jsonData;
                    } else if (jsonData.mainEntity && (jsonData.mainEntity['@type'] === 'Event' || jsonData.mainEntity['@type'] === 'SocialEvent')) {
                        // Sometimes event data is nested under mainEntity
                        eventData = jsonData.mainEntity;
                        console.log(chalk.blue(`🔍 DEBUG: Found event data under mainEntity`));
                    }
                    
                    // Log what we found for debugging
                    if (!eventData) {
                        console.log(chalk.yellow(`🔍 DEBUG: No event data found. Available @types:`));
                        if (Array.isArray(jsonData)) {
                            jsonData.forEach((item, idx) => {
                                console.log(chalk.yellow(`  [${idx}] ${item['@type']}`));
                            });
                        } else {
                            console.log(chalk.yellow(`  Single object: ${jsonData['@type']}`));
                        }
                    }
                    
                    if (eventData) {
                        console.log(chalk.green(`✅ DEBUG: Found event data with @type = ${eventData['@type']}`));
                        const data = {};
                        
                        // Title
                        if (eventData.name) {
                            data.title = this.cleanTitle(eventData.name.trim());
                            console.log(chalk.blue(`🔍 DEBUG: Extracted title: "${data.title}"`));
                        }
                        
                        // Date and time
                        if (eventData.startDate) {
                            const startDate = new Date(eventData.startDate);
                            data.date = startDate.toISOString();
                            data.startTime = startDate.toTimeString().split(' ')[0]; // HH:mm:ss
                            console.log(chalk.blue(`🔍 DEBUG: Extracted date: ${data.date}, time: ${data.startTime}`));
                        }
                        
                        // Location
                        if (eventData.location) {
                            if (eventData.location.name) {
                                data.venue = eventData.location.name.trim();
                                console.log(chalk.blue(`🔍 DEBUG: Extracted venue: "${data.venue}"`));
                            }
                            if (eventData.location.address) {
                                if (typeof eventData.location.address === 'string') {
                                    data.rawLocation = eventData.location.address;
                                } else if (eventData.location.address.streetAddress) {
                                    data.rawLocation = eventData.location.address.streetAddress;
                                }
                                console.log(chalk.blue(`🔍 DEBUG: Extracted location: "${data.rawLocation}"`));
                            }
                        }
                        
                        // Description
                        if (eventData.description) {
                            data.description = eventData.description.substring(0, 500);
                            console.log(chalk.blue(`🔍 DEBUG: Extracted description (${eventData.description.length} chars, truncated to ${data.description.length})`));
                        }
                        
                        // Price/Free status
                        if (eventData.offers) {
                            const offers = Array.isArray(eventData.offers) ? eventData.offers[0] : eventData.offers;
                            if (offers.lowPrice !== undefined) {
                                data.free = offers.lowPrice === 0 || offers.lowPrice === "0";
                                console.log(chalk.blue(`🔍 DEBUG: Extracted free status: ${data.free} (lowPrice: ${offers.lowPrice})`));
                            }
                        }
                        
                        // Image - ENHANCED DEBUG
                        console.log(chalk.magenta(`🖼️  DEBUG: Checking for images in JSON-LD...`));
                        if (eventData.image) {
                            console.log(chalk.magenta(`🖼️  DEBUG: Found image data:`, typeof eventData.image, Array.isArray(eventData.image) ? 'array' : 'single'));
                            console.log(chalk.magenta(`🖼️  DEBUG: Raw image data:`, JSON.stringify(eventData.image, null, 2)));
                            
                            let imageUrl;
                            if (Array.isArray(eventData.image)) {
                                imageUrl = eventData.image[0];
                                console.log(chalk.magenta(`🖼️  DEBUG: Using first image from array: ${imageUrl}`));
                            } else if (typeof eventData.image === 'string') {
                                imageUrl = eventData.image;
                                console.log(chalk.magenta(`🖼️  DEBUG: Using string image URL: ${imageUrl}`));
                            } else if (typeof eventData.image === 'object' && eventData.image.url) {
                                imageUrl = eventData.image.url;
                                console.log(chalk.magenta(`🖼️  DEBUG: Using object image URL: ${imageUrl}`));
                            } else {
                                console.log(chalk.red(`🖼️  DEBUG: Could not extract URL from image data:`, eventData.image));
                            }
                            
                            if (imageUrl) {
                                data.imageUrls = [imageUrl];
                                console.log(chalk.green(`🖼️  DEBUG: Successfully set imageUrls: ["${imageUrl}"]`));
                            }
                        } else {
                            console.log(chalk.yellow(`🖼️  DEBUG: No image data found in JSON-LD`));
                        }
                        
                        console.log(chalk.green('✅ Successfully extracted JSON-LD data'));
                        console.log(chalk.blue(`🔍 DEBUG: Final extracted data:`, JSON.stringify(data, null, 2)));
                        return data;
                    } else {
                        console.log(chalk.yellow(`🔍 DEBUG: No event data found in script ${i + 1}`));
                    }
                } catch (parseError) {
                    console.log(chalk.yellow(`🔍 DEBUG: Failed to parse JSON-LD script ${i + 1}:`, parseError.message));
                    continue; // Try next script tag
                }
            }
            
            console.log(chalk.yellow('⚠️  DEBUG: No valid JSON-LD data found'));
            return null;
        } catch (error) {
            console.log(chalk.yellow('⚠️  JSON-LD extraction error:'), error.message);
            return null;
        }
    }
    
    /**
     * Fill missing data using CSS selectors
     */
    async fillMissingDataWithSelectors(data) {
        try {
            // Title
            if (!data.title) {
                const title = await this.safeTextContent('h1') || 
                             await this.safeTextContent('.event-title') ||
                             'Untitled Event';
                data.title = this.cleanTitle(title);
            }
            
            // Date and time
            if (!data.date || !data.startTime) {
                const dateSelectors = [
                    '.event-details-date p:first-child',
                    'time[datetime]',
                    '.date-time',
                    '.event-date'
                ];
                
                for (const selector of dateSelectors) {
                    try {
                        const element = await this.page.locator(selector).first();
                        if (await element.isVisible({ timeout: 1000 })) {
                            let dateStr = await element.textContent();
                            if (!dateStr && selector.includes('time[datetime]')) {
                                dateStr = await element.getAttribute('datetime');
                            }
                            
                            if (dateStr) {
                                const parsedDate = this.parseEventbriteDate(dateStr);
                                if (parsedDate) {
                                    data.date = parsedDate.date;
                                    data.startTime = parsedDate.startTime;
                                    break;
                                }
                            }
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
            
            // Location
            if (!data.venue || !data.rawLocation) {
                const venueSelectors = [
                    '.event-details-location p:first-child',
                    '.location-info__address-text p:first-child',
                    '.venue-name'
                ];
                
                const addressSelectors = [
                    '.event-details-location p:last-child',
                    '.location-info__address-text p:last-child',
                    '.venue-address'
                ];
                
                if (!data.venue) {
                    for (const selector of venueSelectors) {
                        const venue = await this.safeTextContent(selector);
                        if (venue) {
                            data.venue = venue.trim();
                            break;
                        }
                    }
                }
                
                if (!data.rawLocation) {
                    for (const selector of addressSelectors) {
                        const address = await this.safeTextContent(selector);
                        if (address) {
                            data.rawLocation = address.trim();
                            break;
                        }
                    }
                }
            }
            
            // Description
            if (!data.description) {
                const descSelectors = [
                    '.structured-content-text',
                    '.event-description',
                    '.description'
                ];
                
                for (const selector of descSelectors) {
                    const desc = await this.safeTextContent(selector);
                    if (desc) {
                        data.description = desc.substring(0, 500);
                        break;
                    }
                }
            }
            
            // Price/Free status
            if (data.free === undefined) {
                const priceSelectors = [
                    '.ticket-classes ul li',
                    '.event-pricing',
                    '.price-display'
                ];
                
                for (const selector of priceSelectors) {
                    const priceText = (await this.safeTextContent(selector) || '').toLowerCase();
                    if (priceText) {
                        data.free = priceText.includes('free') || 
                                   priceText.includes('$0') || 
                                   priceText.includes('0.00');
                        break;
                    }
                }
            }
            
            // Sold out status
            if (data.soldOut === undefined) {
                const soldOutSelectors = [
                    '.ticket-classes .sold-out',
                    '.event-availability',
                    '.sold-out-indicator'
                ];
                
                for (const selector of soldOutSelectors) {
                    const soldOutText = await this.safeTextContent(selector);
                    if (soldOutText) {
                        data.soldOut = soldOutText.toLowerCase().includes('sold out');
                        break;
                    }
                }
                
                if (data.soldOut === undefined) {
                    data.soldOut = false; // Default to not sold out
                }
            }
            
        } catch (error) {
            console.log(chalk.yellow('⚠️  CSS selector fallback error:'), error.message);
        }
    }
    
    /**
     * Safe text content extraction with error handling
     */
    async safeTextContent(selector) {
        try {
            return await this.page.textContent(selector, { timeout: 2000 });
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Parse Eventbrite date strings
     */
    parseEventbriteDate(dateStr) {
        try {
            // Clean up the date string
            const cleanDateStr = dateStr.replace(/\s+/g, ' ').trim();
            
            // Try parsing as ISO date first
            let date = new Date(cleanDateStr);
            
            if (isNaN(date.getTime())) {
                // Try various date formats
                const patterns = [
                    /(\w+,?\s+\w+\s+\d{1,2},?\s+\d{4})\s+at\s+(\d{1,2}:\d{2}\s*(AM|PM))/i,
                    /(\w+\s+\d{1,2},?\s+\d{4})\s+(\d{1,2}:\d{2}\s*(AM|PM))/i,
                    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}\s*(AM|PM))/i
                ];
                
                for (const pattern of patterns) {
                    const match = cleanDateStr.match(pattern);
                    if (match) {
                        const datepart = match[1];
                        const timepart = match[2];
                        date = new Date(`${datepart} ${timepart}`);
                        if (!isNaN(date.getTime())) {
                            break;
                        }
                    }
                }
            }
            
            if (!isNaN(date.getTime())) {
                return {
                    date: date.toISOString(),
                    startTime: date.toTimeString().split(' ')[0]
                };
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Scrape Ticketmaster events
     */
    async scrapeTicketmaster() {
        try {
            const data = {};
            
            // Title
            const title = await this.page.textContent('h1.EventDetails-module__heading') ||
                         await this.page.textContent('h1');
            data.title = this.cleanTitle(title);
            
            // Date
            const dateElement = await this.page.locator('.EventDetails-module__date').first();
            if (dateElement) {
                const dateText = await dateElement.textContent();
                data.date = this.parseDate(dateText);
            }
            
            // Time
            const timeElement = await this.page.locator('.EventDetails-module__time').first();
            if (timeElement) {
                const timeText = await timeElement.textContent();
                data.startTime = this.parseTime(timeText);
            }
            
            // Venue
            data.venue = await this.page.textContent('.EventDetails-module__venue-name') ||
                        await this.page.textContent('[data-testid="venue-name"]');
            
            // Address
            data.rawLocation = await this.page.textContent('.EventDetails-module__venue-address') ||
                               await this.page.textContent('[data-testid="venue-address"]');
            
            // Description
            const descElement = await this.page.locator('.EventDetails-module__description').first();
            if (descElement) {
                data.description = (await descElement.textContent() || '').substring(0, 500);
            }
            
            // Price
            const priceElement = await this.page.locator('.PriceDisplay').first();
            if (priceElement) {
                const priceText = (await priceElement.textContent() || '').toLowerCase();
                data.free = priceText.includes('free') || priceText.includes('$0');
            }
            
            // Multiple Image Extraction (Enhanced)
            data.imageUrls = await this.extractTicketmasterImages();
            
            data.ticketsLink = this.page.url();
            
            return data;
            
        } catch (error) {
            console.error(chalk.red('❌ Ticketmaster scraping error:'), error.message);
            return {};
        }
    }
    
    /**
     * Scrape Facebook events
     */
    async scrapeFacebook() {
        try {
            // Facebook is tricky due to dynamic loading and login requirements
            const data = {};
            
            // Basic info that might be in meta tags
            const titleMeta = await this.page.getAttribute('meta[property="og:title"]', 'content');
            data.title = this.cleanTitle(titleMeta);
            
            const descMeta = await this.page.getAttribute('meta[property="og:description"]', 'content');
            data.description = descMeta;
            
            // Multiple Image Extraction (Facebook uses generic patterns)
            data.imageUrls = await this.extractGenericImages();
            
            data.ticketsLink = this.page.url();
            
            return data;
            
        } catch (error) {
            console.error(chalk.red('❌ Facebook scraping error:'), error.message);
            return {};
        }
    }
    
    /**
     * Extract multiple image candidates from Eventbrite
     */
    async extractEventbriteImages() {
        const imageUrls = new Set(); // Use Set to avoid duplicates
        console.log(chalk.magenta('🖼️  DEBUG: Starting Eventbrite image extraction...'));
        
        try {
            // PRIORITY 1: Meta tags (most reliable for main event image)
            console.log(chalk.magenta('🖼️  DEBUG: PRIORITY 1 - Checking meta tag images first...'));
            
            try {
                const ogImage = await this.page.getAttribute('meta[property="og:image"]', 'content');
                console.log(chalk.magenta(`🖼️  DEBUG: og:image = "${ogImage}"`));
                if (ogImage && this.isValidImageUrl(ogImage)) {
                    imageUrls.add(ogImage);
                    console.log(chalk.green(`🖼️  DEBUG: ✅ Added og:image (PRIORITY)`));
                }
            } catch (e) {
                console.log(chalk.yellow(`🖼️  DEBUG: No og:image found`));
            }
            
            try {
                const twitterImage = await this.page.getAttribute('meta[name="twitter:image"]', 'content');
                console.log(chalk.magenta(`🖼️  DEBUG: twitter:image = "${twitterImage}"`));
                if (twitterImage && this.isValidImageUrl(twitterImage) && twitterImage !== (Array.from(imageUrls)[0])) {
                    imageUrls.add(twitterImage);
                    console.log(chalk.green(`🖼️  DEBUG: ✅ Added twitter:image (PRIORITY)`));
                }
            } catch (e) {
                console.log(chalk.yellow(`🖼️  DEBUG: No twitter:image found`));
            }
            
            // PRIORITY 2: Main event hero images (not event cards)
            console.log(chalk.magenta('🖼️  DEBUG: PRIORITY 2 - Checking for main hero images...'));
            const heroSelectors = [
                'main img:not(.event-card-image)',
                '[data-spec="event-hero"] img',
                '.event-hero img',
                '.hero-image img',
                '.primary-image img',
                'picture img:not(.event-card-image)',
                'header img:not(.event-card-image)',
                '.event-header img:not(.event-card-image)'
            ];
            
            for (const selector of heroSelectors) {
                try {
                    const selectorImages = await this.page.locator(selector).all();
                    console.log(chalk.magenta(`🖼️  DEBUG: Hero selector "${selector}" found ${selectorImages.length} images`));
                    
                    for (let i = 0; i < selectorImages.length; i++) {
                        const img = selectorImages[i];
                        const src = await img.getAttribute('src');
                        const className = await img.getAttribute('class');
                        console.log(chalk.magenta(`🖼️  DEBUG: Hero img ${i + 1}: src="${src}", class="${className}"`));
                        
                        if (src && this.isValidImageUrl(src)) {
                            imageUrls.add(src);
                            console.log(chalk.green(`🖼️  DEBUG: ✅ Added from ${selector} (HERO)`));
                        }
                    }
                } catch (e) {
                    // Selector may not exist, continue
                }
            }
            
            // PRIORITY 3: Primary hero images (generic)
            console.log(chalk.magenta('🖼️  DEBUG: PRIORITY 3 - Checking generic hero images (picture img)...'));
            const heroImages = await this.page.locator('picture img').all();
            console.log(chalk.magenta(`🖼️  DEBUG: Found ${heroImages.length} hero image candidates`));
            
            for (let i = 0; i < heroImages.length; i++) {
                const img = heroImages[i];
                const src = await img.getAttribute('src');
                const alt = await img.getAttribute('alt');
                const className = await img.getAttribute('class');
                console.log(chalk.magenta(`🖼️  DEBUG: Hero img ${i + 1}: src="${src}", alt="${alt}", class="${className}"`));
                
                // Skip event card images - we want the main event image
                if (className && className.includes('event-card-image')) {
                    console.log(chalk.yellow(`🖼️  DEBUG: ❌ Skipping event-card-image: ${src ? src.substring(0, 60) : 'null'}...`));
                    continue;
                }
                
                if (src && this.isValidImageUrl(src)) {
                    imageUrls.add(src);
                    console.log(chalk.green(`🖼️  DEBUG: ✅ Added hero image: ${src.substring(0, 80)}...`));
                } else {
                    console.log(chalk.yellow(`🖼️  DEBUG: ❌ Rejected hero image: ${src} (invalid URL)`));
                }
            }
            
            // Gallery images (if any)
            console.log(chalk.magenta('🖼️  DEBUG: Checking for gallery images...'));
            const galleryImages = await this.page.locator('.event-gallery img, .image-gallery img').all();
            console.log(chalk.magenta(`🖼️  DEBUG: Found ${galleryImages.length} gallery image candidates`));
            
            for (let i = 0; i < galleryImages.length; i++) {
                const img = galleryImages[i];
                const src = await img.getAttribute('src');
                console.log(chalk.magenta(`🖼️  DEBUG: Gallery img ${i + 1}: ${src}`));
                
                if (src && this.isValidImageUrl(src)) {
                    imageUrls.add(src);
                    console.log(chalk.green(`🖼️  DEBUG: ✅ Added gallery image`));
                }
            }
            
            // Event card images and featured images
            console.log(chalk.magenta('🖼️  DEBUG: Checking for card/featured images...'));
            const cardImages = await this.page.locator('.event-card img, .listing-card img, .featured-image img').all();
            console.log(chalk.magenta(`🖼️  DEBUG: Found ${cardImages.length} card/featured image candidates`));
            
            for (let i = 0; i < cardImages.length; i++) {
                const img = cardImages[i];
                const src = await img.getAttribute('src');
                console.log(chalk.magenta(`🖼️  DEBUG: Card img ${i + 1}: ${src}`));
                
                if (src && this.isValidImageUrl(src)) {
                    imageUrls.add(src);
                    console.log(chalk.green(`🖼️  DEBUG: ✅ Added card image`));
                }
            }
            
            // Structured data images
            console.log(chalk.magenta('🖼️  DEBUG: Checking for structured data images...'));
            const structuredImages = await this.page.locator('[data-testid*="image"] img, [class*="image"] img').all();
            console.log(chalk.magenta(`🖼️  DEBUG: Found ${structuredImages.length} structured image candidates`));
            
            for (let i = 0; i < structuredImages.length; i++) {
                const img = structuredImages[i];
                const src = await img.getAttribute('src');
                const testId = await img.getAttribute('data-testid');
                const className = await img.getAttribute('class');
                console.log(chalk.magenta(`🖼️  DEBUG: Structured img ${i + 1}: src="${src}", testid="${testId}", class="${className}"`));
                
                if (src && this.isValidImageUrl(src)) {
                    imageUrls.add(src);
                    console.log(chalk.green(`🖼️  DEBUG: ✅ Added structured image`));
                }
            }
            
            // Additional modern Eventbrite selectors (2024/2025)
            console.log(chalk.magenta('🖼️  DEBUG: Checking for modern Eventbrite image patterns...'));
            const modernSelectors = [
                'img[data-automation-id*="image"]',
                'img[data-spec="event-image"]',
                '[data-spec="event-header"] img',
                '.event-listing-image img',
                '.eventbrite-image img',
                '.eds-event-card__image img',
                '.event-hero-image img',
                '.primary-event-image img',
                'main img',
                'article img',
                'section img',
                'header img'
            ];
            
            for (const selector of modernSelectors) {
                try {
                    const selectorImages = await this.page.locator(selector).all();
                    console.log(chalk.magenta(`🖼️  DEBUG: Selector "${selector}" found ${selectorImages.length} images`));
                    
                    for (let i = 0; i < selectorImages.length; i++) {
                        const img = selectorImages[i];
                        const src = await img.getAttribute('src');
                        const alt = await img.getAttribute('alt');
                        console.log(chalk.magenta(`🖼️  DEBUG: ${selector} img ${i + 1}: src="${src}", alt="${alt}"`));
                        
                        if (src && this.isValidImageUrl(src)) {
                            imageUrls.add(src);
                            console.log(chalk.green(`🖼️  DEBUG: ✅ Added from ${selector}`));
                        }
                    }
                } catch (e) {
                    // Selector may not exist, continue
                }
            }
            
            // PRIORITY 4: If we still don't have enough images, carefully check other selectors
            if (imageUrls.size === 0) {
                console.log(chalk.red('🖼️  DEBUG: PRIORITY 4 - No images found yet, checking remaining selectors...'));
                
                // Check all images but filter out event cards
                const allImages = await this.page.locator('img').all();
                console.log(chalk.magenta(`🖼️  DEBUG: Found ${allImages.length} total images, filtering...`));
                
                for (let i = 0; i < allImages.length; i++) {
                    const img = allImages[i];
                    const src = await img.getAttribute('src');
                    const className = await img.getAttribute('class') || '';
                    const alt = await img.getAttribute('alt') || '';
                    
                    // Skip event card images, tracking pixels, small images
                    if (className.includes('event-card-image') || 
                        src.includes('tracking') ||
                        src.includes('pixel') ||
                        src.includes('analytics') ||
                        src.includes('bing.com') ||
                        src.includes('facebook.com') ||
                        alt.includes('tracking')) {
                        console.log(chalk.yellow(`🖼️  DEBUG: ❌ Skipping filtered image: ${src ? src.substring(0, 40) : 'null'}...`));
                        continue;
                    }
                    
                    if (src && this.isValidImageUrl(src)) {
                        imageUrls.add(src);
                        console.log(chalk.green(`🖼️  DEBUG: ✅ Added filtered image: ${src.substring(0, 60)}...`));
                        break; // Stop after finding first valid non-card image
                    }
                }
            }
            
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Error extracting Eventbrite images: ${error.message}`));
        }
        
        const urlArray = Array.from(imageUrls);
        console.log(chalk.cyan(`🖼️  DEBUG: Found ${urlArray.length} total image candidates from Eventbrite`));
        
        if (urlArray.length > 0) {
            console.log(chalk.magenta('🖼️  DEBUG: All found URLs:'));
            urlArray.forEach((url, i) => {
                console.log(chalk.magenta(`🖼️  DEBUG: [${i + 1}] ${url.substring(0, 100)}...`));
            });
        } else {
            console.log(chalk.red('🖼️  DEBUG: ❌ NO IMAGES FOUND!'));
        }
        
        return urlArray;
    }
    
    /**
     * Extract multiple image candidates from Ticketmaster
     */
    async extractTicketmasterImages() {
        const imageUrls = new Set();
        
        try {
            // Hero images
            const heroImages = await this.page.locator('.EventHero-module__image img, .hero-image img').all();
            for (const img of heroImages) {
                const src = await img.getAttribute('src');
                if (src && this.isValidImageUrl(src)) {
                    imageUrls.add(src);
                }
            }
            
            // Event detail images
            const detailImages = await this.page.locator('.EventDetails-module__image img').all();
            for (const img of detailImages) {
                const src = await img.getAttribute('src');
                if (src && this.isValidImageUrl(src)) {
                    imageUrls.add(src);
                }
            }
            
            // All event-related images
            const eventImages = await this.page.locator('img[alt*="event" i], img[alt*="concert" i], img[alt*="show" i]').all();
            for (const img of eventImages) {
                const src = await img.getAttribute('src');
                if (src && this.isValidImageUrl(src)) {
                    imageUrls.add(src);
                }
            }
            
            // Meta tags
            const ogImage = await this.page.getAttribute('meta[property="og:image"]', 'content');
            if (ogImage && this.isValidImageUrl(ogImage)) {
                imageUrls.add(ogImage);
            }
            
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Error extracting Ticketmaster images: ${error.message}`));
        }
        
        const urlArray = Array.from(imageUrls);
        console.log(chalk.cyan(`🖼️  Found ${urlArray.length} image candidates from Ticketmaster`));
        
        return urlArray;
    }
    
    /**
     * Extract multiple image candidates using generic patterns
     */
    async extractGenericImages() {
        const imageUrls = new Set();
        
        try {
            // Common event image patterns
            const selectors = [
                'img[class*="event" i]',
                'img[class*="hero" i]',
                'img[class*="featured" i]',
                'img[class*="main" i]',
                'img[class*="primary" i]',
                'img[class*="banner" i]',
                'img[class*="poster" i]',
                'img[class*="flyer" i]',
                '.event-image img',
                '.hero-image img',
                '.featured-image img',
                '.main-image img',
                '.event-header img',
                '.event-card img',
                'img[alt*="event" i]',
                'img[alt*="concert" i]',
                'img[alt*="show" i]',
                'img[alt*="festival" i]'
            ];
            
            for (const selector of selectors) {
                try {
                    const images = await this.page.locator(selector).all();
                    for (const img of images) {
                        const src = await img.getAttribute('src');
                        if (src && this.isValidImageUrl(src)) {
                            imageUrls.add(src);
                        }
                    }
                } catch (e) {
                    // Continue if selector fails
                }
            }
            
            // Meta tags
            const metaSelectors = [
                'meta[property="og:image"]',
                'meta[name="twitter:image"]',
                'meta[property="twitter:image"]',
                'meta[name="image"]'
            ];
            
            for (const selector of metaSelectors) {
                try {
                    const content = await this.page.getAttribute(selector, 'content');
                    if (content && this.isValidImageUrl(content)) {
                        imageUrls.add(content);
                    }
                } catch (e) {
                    // Continue if selector fails
                }
            }
            
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Error extracting generic images: ${error.message}`));
        }
        
        const urlArray = Array.from(imageUrls);
        console.log(chalk.cyan(`🖼️  Found ${urlArray.length} image candidates from generic extraction`));
        
        return urlArray;
    }
    
    /**
     * Validate if URL is a valid image URL
     */
    isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const parsed = new URL(url, this.page?.url());
            const pathname = parsed.pathname.toLowerCase();
            
            const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
            const hasValidExtension = validExtensions.some(ext => 
                pathname.includes(`.${ext}`) || pathname.endsWith(`.${ext}`)
            );
            
            // Also accept URLs that look like they serve images (common CDN patterns)
            const looksLikeImage = pathname.includes('image') || 
                                  pathname.includes('img') ||
                                  pathname.includes('photo') ||
                                  parsed.hostname.includes('img') ||
                                  parsed.hostname.includes('cdn');
            
            return hasValidExtension || looksLikeImage;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Generic scraping using Universal Extraction System
     * 
     * Implements the 5-layer cascade system for comprehensive event data extraction:
     * Layer 1: Enhanced structured data extraction (JSON-LD, Microdata, RDFa)
     * Layer 2: Meta tag extraction system  
     * Layer 3: Semantic HTML pattern recognition
     * Layer 4: Text pattern matching algorithms
     * Layer 5: Intelligent content analysis fallback
     * 
     * @param {Object} config - Optional configuration overrides
     * @returns {Object} Extracted and validated event data with confidence scores
     */
    async scrapeGeneric(config = {}) {
        const startTime = Date.now();
        let extractorInstance = null;
        
        try {
            if (this.options.debug) {
                console.log(chalk.blue('\n🚀 Starting Universal Generic Scraping...'));
                console.log(chalk.gray(`📍 URL: ${await this.page.url()}`));
            }

            // Initialize Universal Extractor with current page and options
            const extractorOptions = {
                // Extraction thresholds
                minConfidence: config.minConfidence || 60,
                preferHighConfidence: config.preferHighConfidence !== false,
                
                // Layer configuration  
                enabledLayers: config.enabledLayers || [1, 2, 3, 4, 5],
                layerTimeout: config.layerTimeout || 2000,
                
                // Hash app requirements
                enforceHashRequirements: config.enforceHashRequirements !== false,
                requireAddressComma: config.requireAddressComma !== false,
                
                // Debug settings
                debug: this.options.debug || config.debug || false,
                verbose: this.options.verbose || config.verbose || false,
                
                // Merge with provided config
                ...config
            };
            
            extractorInstance = new UniversalExtractor(this.page, extractorOptions);
            
            // Run the 5-layer extraction cascade
            if (extractorOptions.debug) {
                console.log(chalk.blue('📊 Running 5-layer extraction cascade...'));
            }
            
            const extractionResult = await extractorInstance.extract();
            
            if (!extractionResult || !extractionResult.data) {
                console.warn(chalk.yellow('⚠️  Universal extraction returned empty data'));
                return await this.fallbackToLegacyExtraction(config);
            }
            
            // Extract raw data and confidence scores
            let rawData = extractionResult.data;
            const confidenceScores = extractionResult.confidence || {};
            const layerResults = extractionResult.layerResults || {};
            
            if (extractorOptions.debug) {
                console.log(chalk.green('✅ Raw extraction completed'));
                console.log(chalk.gray(`📈 Confidence scores: ${JSON.stringify(confidenceScores, null, 2)}`));
                console.log(chalk.gray(`🔍 Layer results: ${Object.keys(layerResults).join(', ')}`));
            }

            // Enhance data with specialized extractors
            rawData = await this.enhanceWithSpecializedExtractors(rawData, confidenceScores);
            
            // Ensure rawData is not null before validation
            if (!rawData || typeof rawData !== 'object') {
                console.warn(chalk.yellow('⚠️  Raw data is null or invalid, creating empty data object'));
                rawData = {};
            }

            // Apply data validation and fixing for Hash app requirements
            const validationResult = this.dataValidator.validate(rawData);
            
            if (!validationResult.isValid && extractorOptions.debug) {
                console.warn(chalk.yellow('⚠️  Validation issues found:'));
                validationResult.errors.forEach(error => {
                    console.warn(chalk.yellow(`   • ${error}`));
                });
            }
            
            // Get the final validated data with null safety
            let finalData = validationResult.data || {};
            
            // Ensure finalData is a valid object before adding properties
            if (!finalData || typeof finalData !== 'object') {
                console.warn(chalk.yellow('⚠️  Validation returned invalid data, creating empty object'));
                finalData = {};
            }
            
            // Add extraction metadata (now safe)
            finalData._extraction = {
                method: 'universal',
                timestamp: new Date().toISOString(),
                processingTimeMs: Date.now() - startTime,
                confidenceScores: confidenceScores,
                totalLayers: extractorOptions.enabledLayers.length,
                validationPassed: validationResult.isValid,
                validationScore: validationResult.score,
                hashCompliant: validationResult.hashCompliant
            };
            
            // Final validation check
            if (!finalData.title && !finalData.name) {
                console.warn(chalk.yellow('⚠️  No title found, falling back to legacy extraction'));
                return await this.fallbackToLegacyExtraction(config);
            }
            
            // Log success
            if (extractorOptions.debug) {
                console.log(chalk.green('\n✅ Universal Generic Scraping Complete'));
                console.log(chalk.gray(`⏱️  Processing time: ${finalData._extraction.processingTimeMs}ms`));
                console.log(chalk.gray(`🎯 Overall confidence: ${this.calculateOverallConfidence(confidenceScores)}%`));
                console.log(chalk.gray(`📊 Validation score: ${validationResult.score}%`));
            }
            
            return finalData;
            
        } catch (error) {
            console.error(chalk.red('❌ Universal Generic Scraping Error:'), error.message);
            
            if (this.options.debug) {
                console.error(chalk.red('Stack trace:'), error.stack);
            }
            
            // Fallback to legacy extraction on critical errors
            console.log(chalk.yellow('🔄 Falling back to legacy extraction...'));
            return await this.fallbackToLegacyExtraction(config);
        } finally {
            // Cleanup
            if (extractorInstance) {
                extractorInstance = null;
            }
        }
    }

    /**
     * Enhance extracted data with specialized extractors for better accuracy
     * @param {Object} rawData - Raw extracted data
     * @param {Object} confidenceScores - Confidence scores from extraction
     * @returns {Object} Enhanced data
     */
    async enhanceWithSpecializedExtractors(rawData, confidenceScores) {
        try {
            // Ensure rawData is a valid object
            if (!rawData || typeof rawData !== 'object') {
                if (this.options.debug) {
                    console.warn(chalk.yellow('⚠️  Raw data is null in enhancement step, using empty object'));
                }
                rawData = {};
            }
            
            const enhancedData = { ...rawData };
            
            // Enhance date/time extraction with specialized parser
            if (rawData.dateTime || rawData.startDate || rawData.date || rawData.time) {
                const dateTimeText = [
                    rawData.dateTime,
                    rawData.startDate, 
                    rawData.endDate,
                    rawData.date,
                    rawData.time
                ].filter(Boolean).join(' ');
                
                if (dateTimeText) {
                    const parsedDateTime = this.dateTimeParser.parse(dateTimeText);
                    if (parsedDateTime) {
                        enhancedData.startDate = parsedDateTime.date;
                        // enhancedData.endDate = parsedDateTime.endDate; // Not available from basic parser
                        enhancedData.startTime = parsedDateTime.time;
                        // enhancedData.endTime = parsedDateTime.endTime; // Not available from basic parser
                        
                        if (this.options.debug) {
                            console.log(chalk.green('📅 Enhanced date/time parsing successful'));
                        }
                    }
                }
            }
            
            // Enhance venue/address extraction with specialized extractor
            if (rawData.location || rawData.venue || rawData.address) {
                const locationText = [
                    rawData.location,
                    rawData.venue, 
                    rawData.address
                ].filter(Boolean).join(' ');
                
                if (locationText) {
                    const venueResult = this.venueExtractor.extractVenueAndAddress(locationText);
                    if (venueResult) {
                        if (venueResult.venue) {
                            enhancedData.venue = venueResult.venue;
                        }
                        if (venueResult.address) {
                            enhancedData.address = venueResult.address;
                        }
                        
                        if (this.options.debug) {
                            console.log(chalk.green('🏢 Enhanced venue/address extraction successful'));
                        }
                    }
                }
            }
            
            // Enhance image extraction with existing selector (with timeout)
            if (!rawData.imageUrls || rawData.imageUrls.length === 0) {
                try {
                    // Use reduced timeout for image extraction
                    const imagePromise = this.extractGenericImages();
                    const timeoutPromise = new Promise((resolve) => 
                        setTimeout(() => resolve([]), this.options.imageTimeout)
                    );
                    
                    const genericImages = await Promise.race([imagePromise, timeoutPromise]);
                    if (genericImages && genericImages.length > 0) {
                        enhancedData.imageUrls = genericImages;
                        
                        if (this.options.debug) {
                            console.log(chalk.green(`🖼️  Enhanced image extraction: ${genericImages.length} images found`));
                        }
                    }
                } catch (error) {
                    if (this.options.debug) {
                        console.warn(chalk.yellow('⚠️  Image enhancement failed:'), error.message);
                    }
                }
            }
            
            // Enhance category mapping
            if (rawData.category || rawData.type || rawData.genre) {
                const categoryText = [
                    rawData.category,
                    rawData.type,
                    rawData.genre
                ].filter(Boolean).join(' ');
                
                if (categoryText) {
                    const mappedCategory = this.categoryMapper.mapCategory(categoryText);
                    if (mappedCategory) {
                        enhancedData.category = mappedCategory;
                        
                        if (this.options.debug) {
                            console.log(chalk.green(`🏷️  Enhanced category mapping: ${categoryText} -> ${mappedCategory}`));
                        }
                    }
                }
            }
            
            return enhancedData;
            
        } catch (error) {
            console.warn(chalk.yellow('⚠️  Enhancement with specialized extractors failed:'), error.message);
            // Ensure we never return null even on enhancement failure
            return rawData || {}; // Return original data or empty object on enhancement failure
        }
    }

    /**
     * Fallback to legacy extraction when Universal Extraction fails
     * @param {Object} config - Configuration options
     * @returns {Object} Extracted data using legacy method
     */
    async fallbackToLegacyExtraction(config) {
        try {
            if (this.options.debug) {
                console.log(chalk.yellow('🔄 Using legacy extraction method...'));
            }
            
            const data = {};
            const selectors = config.selectors || {};
            
            // Extract data using configured selectors (legacy method)
            for (const [field, selector] of Object.entries(selectors)) {
                try {
                    const element = await this.page.locator(selector).first();
                    if (element) {
                        const textContent = await element.textContent();
                        if (textContent && textContent.trim()) {
                            data[field] = textContent.trim();
                        }
                    }
                } catch (e) {
                    // Continue if selector fails
                    if (this.options.debug) {
                        console.warn(chalk.yellow(`⚠️  Legacy selector failed for ${field}:`, e.message));
                    }
                }
            }
            
            // Multiple Image Extraction (Generic patterns)
            try {
                data.imageUrls = await this.extractGenericImages();
            } catch (error) {
                data.imageUrls = [];
                if (this.options.debug) {
                    console.warn(chalk.yellow('⚠️  Legacy image extraction failed:'), error.message);
                }
            }
            
            // Add extraction metadata
            data._extraction = {
                method: 'legacy',
                timestamp: new Date().toISOString(),
                fallbackUsed: true
            };
            
            if (this.options.debug) {
                console.log(chalk.yellow('✅ Legacy extraction completed'));
                console.log(chalk.gray(`📊 Extracted fields: ${Object.keys(data).filter(k => k !== '_extraction').join(', ')}`));
            }
            
            return data;
            
        } catch (error) {
            console.error(chalk.red('❌ Legacy extraction also failed:'), error.message);
            return {
                _extraction: {
                    method: 'legacy',
                    timestamp: new Date().toISOString(),
                    fallbackUsed: true,
                    failed: true,
                    error: error.message
                }
            };
        }
    }

    /**
     * Calculate overall confidence score from individual field confidences
     * @param {Object} confidenceScores - Individual field confidence scores
     * @returns {number} Overall confidence percentage
     */
    calculateOverallConfidence(confidenceScores) {
        const scores = Object.values(confidenceScores).filter(score => typeof score === 'number');
        if (scores.length === 0) return 0;
        
        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        return Math.round(average);
    }
    
    /**
     * Process and format scraped data for Firebase
     */
    async processEventData(rawData) {
        console.log(chalk.blue('🔄 DEBUG: Starting data processing...'));
        console.log(chalk.blue('🔍 DEBUG: Raw data received:'), JSON.stringify({
            hasTitle: !!rawData.title,
            hasImageUrl: !!rawData.imageUrl,
            hasImageUrls: !!rawData.imageUrls,
            imageUrlsLength: rawData.imageUrls ? rawData.imageUrls.length : 0,
            hasVenue: !!rawData.venue,
            hasRawLocation: !!rawData.rawLocation
        }, null, 2));
        
        // Parse location data
        const locationData = this.locationUtils.parseLocation(rawData.rawLocation || rawData.venue || '');
        
        // Map categories
        const categories = this.categoryMapper.smartMapCategories({
            title: rawData.title || '',
            description: rawData.description || '',
            venue: locationData.venue || rawData.venue || '',
            tags: rawData.tags || []
        });
        
        // Smart Image Selection (Enhanced with DEBUG)
        let selectedImageUrl = rawData.imageUrl; // Fallback to single image
        
        console.log(chalk.magenta('🖼️  DEBUG: Starting image selection process...'));
        console.log(chalk.magenta(`🖼️  DEBUG: rawData.imageUrl = "${rawData.imageUrl}"`));
        console.log(chalk.magenta(`🖼️  DEBUG: rawData.imageUrls = ${rawData.imageUrls ? JSON.stringify(rawData.imageUrls) : 'null'}`));
        
        if (rawData.imageUrls && rawData.imageUrls.length > 0) {
            console.log(chalk.cyan(`🖼️  DEBUG: Selecting best image from ${rawData.imageUrls.length} candidates...`));
            console.log(chalk.magenta('🖼️  DEBUG: Candidates:'));
            rawData.imageUrls.forEach((url, i) => {
                console.log(chalk.magenta(`🖼️  DEBUG: [${i + 1}] ${url}`));
            });
            
            selectedImageUrl = await this.imageSelector.selectBestImage(
                rawData.imageUrls,
                rawData.title || '',
                locationData.venue || rawData.venue || ''
            );
            
            console.log(chalk.magenta(`🖼️  DEBUG: Image selector returned: "${selectedImageUrl}"`));
            
            if (selectedImageUrl) {
                console.log(chalk.green(`✅ Selected optimal image (square/4:5 ratio preferred)`));
            } else {
                console.log(chalk.yellow(`⚠️  No suitable image found, using fallback`));
                selectedImageUrl = rawData.imageUrls[0]; // Use first as fallback
                console.log(chalk.yellow(`🖼️  DEBUG: Using fallback image: "${selectedImageUrl}"`));
            }
        } else if (selectedImageUrl) {
            console.log(chalk.gray(`📷 Using single image provided: "${selectedImageUrl}"`));
        } else {
            console.log(chalk.red(`❌ DEBUG: No images available at all!`));
        }
        
        console.log(chalk.magenta(`🖼️  DEBUG: Final selectedImageUrl before Firebase: "${selectedImageUrl}"`));
        
        // Format for Firebase - prioritize venue name from JSON-LD over parsed address
        const processedData = this.firebase.formatEventData({
            title: rawData.title || 'Untitled Event',
            description: rawData.description || '',
            venue: rawData.venue || locationData.venue || '',  // Prioritize actual venue name
            address: locationData.address || rawData.rawLocation || 'Address TBD',
            city: locationData.city,
            date: rawData.date || new Date().toISOString(),
            startTime: rawData.startTime || '19:00:00',
            endTime: rawData.endTime,
            endDate: rawData.endDate,
            categories: categories,
            free: Boolean(rawData.free),
            soldOut: Boolean(rawData.soldOut),
            ticketsLink: rawData.ticketsLink || rawData.sourceUrl || '',
            imageUrl: selectedImageUrl
        });
        
        console.log(chalk.magenta(`🖼️  DEBUG: Firebase formatted data imageUrl: "${processedData.imageUrl}"`));
        
        return processedData;
    }
    
    /**
     * Clean event title by removing quotation marks
     */
    cleanTitle(title) {
        if (!title || typeof title !== 'string') return title;
        
        // Remove surrounding quotation marks (both single and double quotes)
        // Also handle quotes that only surround the first part of the title
        return title.replace(/^["']([^"']+?)["']/, '$1').trim();
    }
    
    /**
     * Parse date string to ISO format
     */
    parseDate(dateText) {
        if (!dateText) return new Date().toISOString();
        
        try {
            return new Date(dateText).toISOString();
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not parse date: "${dateText}"`));
            return new Date().toISOString();
        }
    }
    
    /**
     * Parse time string to HH:mm:ss format
     */
    parseTime(timeText) {
        if (!timeText) return '19:00:00';
        
        try {
            // Handle common time formats
            const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2];
                const ampm = timeMatch[3];
                
                if (ampm && ampm.toUpperCase() === 'PM' && hours !== 12) {
                    hours += 12;
                } else if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) {
                    hours = 0;
                }
                
                return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
            }
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not parse time: "${timeText}"`));
        }
        
        return '19:00:00';
    }
    
    /**
     * Scrape multiple events from URLs
     */
    async scrapeMultiple(urls, options = {}) {
        const results = [];
        const errors = [];
        
        console.log(chalk.blue(`\n🚀 Starting batch scrape of ${urls.length} URLs...\n`));
        
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            
            try {
                console.log(chalk.cyan(`[${i + 1}/${urls.length}] Scraping: ${url}`));
                
                const eventData = await this.scrapeEvent(url);
                results.push({
                    url: url,
                    success: true,
                    data: eventData
                });
                
                // Add delay between requests
                if (i < urls.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.options.delay));
                }
                
            } catch (error) {
                console.error(chalk.red(`❌ Failed to scrape ${url}:`), error.message);
                
                errors.push({
                    url: url,
                    error: error.message
                });
                
                results.push({
                    url: url,
                    success: false,
                    error: error.message
                });
            }
        }
        
        console.log(chalk.blue(`\n✅ Batch scrape complete:`));
        console.log(chalk.green(`   Successful: ${results.filter(r => r.success).length}`));
        console.log(chalk.red(`   Failed: ${errors.length}`));
        
        return { results, errors };
    }

    /**
     * Extract multiple events from a single venue listing page (OPTIMIZED)
     * Useful for venue sites that display multiple upcoming events
     * 
     * @param {Object} options - Configuration options
     * @returns {Array} Array of extracted event data objects
     */
    async scrapeEventListing(options = {}) {
        const startTime = Date.now();
        const results = [];
        
        try {
            if (this.options.debug) {
                console.log(chalk.blue('\n📋 Starting Optimized Multi-Event Listing Extraction...'));
                console.log(chalk.gray(`📍 URL: ${await this.page.url()}`));
            }

            // First, check for structured data with multiple events (like UC Theatre)
            let structuredEvents = await this.extractStructuredEventList();
            
            // Apply batch limit for performance
            if (structuredEvents && structuredEvents.length > this.options.maxEventsBatch) {
                if (this.options.debug) {
                    console.log(chalk.yellow(`⚡ Limiting events from ${structuredEvents.length} to ${this.options.maxEventsBatch} for performance`));
                }
                structuredEvents = structuredEvents.slice(0, this.options.maxEventsBatch);
            }
            
            if (structuredEvents && structuredEvents.length > 0) {
                if (this.options.debug) {
                    console.log(chalk.green(`✅ Found ${structuredEvents.length} structured events`));
                }
                
                // Process events in parallel batches of 3 for better performance
                const batchSize = 3;
                for (let i = 0; i < structuredEvents.length; i += batchSize) {
                    const batch = structuredEvents.slice(i, i + batchSize);
                    
                    // Process batch in parallel
                    const batchPromises = batch.map(async (eventData, batchIndex) => {
                        const actualIndex = i + batchIndex;
                        
                        // Ensure eventData is valid
                        if (!eventData || typeof eventData !== 'object') {
                            return null;
                        }
                        
                        try {
                            // Skip address enhancement in testing scenarios
                            const enhancementOptions = this.options.skipAddressEnhancement ? 
                                { skipAddressEnhancement: true } : {};
                            
                            // Enhance each event with specialized extractors
                            const enhancedData = await this.enhanceWithSpecializedExtractors(eventData, enhancementOptions);
                            
                            // Validate for Hash app compliance (with timeout)
                            const validationResult = await Promise.race([
                                this.dataValidator.validate(enhancedData),
                                new Promise((resolve) => setTimeout(() => resolve({ data: enhancedData, isValid: false, hashCompliant: false }), 1000))
                            ]);
                            
                            let finalData = validationResult.data || {};
                            
                            // Add extraction metadata
                            finalData._extraction = {
                                method: 'structured_listing_parallel',
                                timestamp: new Date().toISOString(),
                                listingPosition: actualIndex + 1,
                                totalEvents: structuredEvents.length,
                                batchIndex: Math.floor(actualIndex / batchSize),
                                validationPassed: validationResult.isValid,
                                hashCompliant: validationResult.hashCompliant
                            };
                            
                            return finalData;
                            
                        } catch (error) {
                            if (this.options.debug) {
                                console.warn(chalk.yellow(`⚠️  Event ${actualIndex + 1} processing failed: ${error.message}`));
                            }
                            return null;
                        }
                    });
                    
                    // Wait for batch to complete
                    const batchResults = await Promise.allSettled(batchPromises);
                    
                    // Add successful results
                    batchResults.forEach(result => {
                        if (result.status === 'fulfilled' && result.value) {
                            results.push(result.value);
                        }
                    });
                    
                    // Early termination for testing scenarios
                    if (this.options.enableEarlyTermination && results.length >= 5) {
                        if (this.options.debug) {
                            console.log(chalk.yellow(`⚡ Early termination: stopping at ${results.length} events for testing`));
                        }
                        break;
                    }
                }
            } else {
                // Fallback to HTML pattern detection for event listings (with limits)
                let htmlEvents = await this.extractHTMLEventList();
                
                // Apply batch limit
                if (htmlEvents && htmlEvents.length > this.options.maxEventsBatch) {
                    htmlEvents = htmlEvents.slice(0, this.options.maxEventsBatch);
                }
                
                if (htmlEvents && htmlEvents.length > 0) {
                    if (this.options.debug) {
                        console.log(chalk.yellow(`⚡ Found ${htmlEvents.length} HTML pattern events`));
                    }
                    
                    // Process HTML events with similar parallel processing
                    const batchSize = 3;
                    for (let i = 0; i < htmlEvents.length; i += batchSize) {
                        const batch = htmlEvents.slice(i, i + batchSize);
                        
                        const batchPromises = batch.map(async (eventData, batchIndex) => {
                            const actualIndex = i + batchIndex;
                            
                            if (!eventData || typeof eventData !== 'object') {
                                return null;
                            }
                            
                            try {
                                const enhancementOptions = this.options.skipAddressEnhancement ? 
                                    { skipAddressEnhancement: true } : {};
                                
                                const enhancedData = await this.enhanceWithSpecializedExtractors(eventData, enhancementOptions);
                                const validationResult = await Promise.race([
                                    this.dataValidator.validate(enhancedData),
                                    new Promise((resolve) => setTimeout(() => resolve({ data: enhancedData, isValid: false, hashCompliant: false }), 1000))
                                ]);
                                
                                let finalData = validationResult.data || {};
                                
                                finalData._extraction = {
                                    method: 'html_listing_parallel',
                                    timestamp: new Date().toISOString(),
                                    listingPosition: actualIndex + 1,
                                    totalEvents: htmlEvents.length,
                                    batchIndex: Math.floor(actualIndex / batchSize),
                                    validationPassed: validationResult.isValid,
                                    hashCompliant: validationResult.hashCompliant
                                };
                                
                                return finalData;
                                
                            } catch (error) {
                                if (this.options.debug) {
                                    console.warn(chalk.yellow(`⚠️  HTML Event ${actualIndex + 1} processing failed: ${error.message}`));
                                }
                                return null;
                            }
                        });
                        
                        const batchResults = await Promise.allSettled(batchPromises);
                        batchResults.forEach(result => {
                            if (result.status === 'fulfilled' && result.value) {
                                results.push(result.value);
                            }
                        });
                        
                        // Early termination
                        if (this.options.enableEarlyTermination && results.length >= 5) {
                            if (this.options.debug) {
                                console.log(chalk.yellow(`⚡ Early termination: stopping at ${results.length} events`));
                            }
                            break;
                        }
                    }
                }
            }
            
            if (this.options.debug) {
                console.log(chalk.green(`\n✅ Event Listing Extraction Complete`));
                console.log(chalk.gray(`⏱️  Processing time: ${Date.now() - startTime}ms`));
                console.log(chalk.gray(`📊 Extracted ${results.length} events`));
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Event listing extraction failed:'), error.message);
        }
        
        return results;
    }

    /**
     * Extract events from structured data (JSON-LD, microdata)
     * @returns {Array} Array of structured event data
     */
    async extractStructuredEventList() {
        try {
            return await this.page.evaluate(() => {
                const events = [];
                
                // Extract JSON-LD events
                const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
                
                for (const script of jsonLdScripts) {
                    try {
                        const data = JSON.parse(script.textContent);
                        
                        // Handle single event
                        if (data['@type'] && (data['@type'] === 'Event' || data['@type'] === 'MusicEvent')) {
                            events.push({
                                title: data.name,
                                startDate: data.startDate?.split('T')[0],
                                startTime: data.startDate?.split('T')[1]?.substring(0, 8),
                                venue: data.location?.name,
                                address: data.location?.address ? 
                                    `${data.location.address.streetAddress}, ${data.location.address.addressLocality}, ${data.location.address.addressRegion} ${data.location.address.postalCode}` : null,
                                description: data.description,
                                categories: ['Music'], // Default for MusicEvent
                                free: false,
                                ticketsLink: data.offers?.url
                            });
                        }
                        
                        // Handle array of events
                        if (Array.isArray(data)) {
                            for (const item of data) {
                                if (item['@type'] && (item['@type'] === 'Event' || item['@type'] === 'MusicEvent')) {
                                    events.push({
                                        title: item.name,
                                        startDate: item.startDate?.split('T')[0],
                                        startTime: item.startDate?.split('T')[1]?.substring(0, 8),
                                        venue: item.location?.name,
                                        address: item.location?.address ? 
                                            `${item.location.address.streetAddress}, ${item.location.address.addressLocality}, ${item.location.address.addressRegion} ${item.location.address.postalCode}` : null,
                                        description: item.description,
                                        categories: ['Music'],
                                        free: false,
                                        ticketsLink: item.offers?.url
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
                
                return events;
            });
        } catch (error) {
            if (this.options.debug) {
                console.warn(chalk.yellow('⚠️  Structured event list extraction failed:'), error.message);
            }
            return [];
        }
    }

    /**
     * Extract events from HTML patterns (fallback method)
     * @returns {Array} Array of event data from HTML patterns
     */
    async extractHTMLEventList() {
        try {
            return await this.page.evaluate(() => {
                const events = [];
                
                // Common selectors for event listings
                const eventSelectors = [
                    '.event-item',
                    '.event-listing',
                    '.event-card',
                    '.show-listing',
                    '.concert-item',
                    '.upcoming-event',
                    '[class*="event"]',
                    '.eventListings li'  // UC Theatre specific
                ];
                
                let eventElements = [];
                
                // Find event container elements
                for (const selector of eventSelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        eventElements = Array.from(elements);
                        break;
                    }
                }
                
                // Extract data from each event element
                for (const element of eventElements) {
                    try {
                        const event = {
                            title: null,
                            date: null,
                            time: null,
                            venue: null,
                            address: null,
                            categories: ['Music']
                        };
                        
                        // Extract title
                        const titleSelectors = ['h1', 'h2', 'h3', '.title', '.name', '.event-name', '.eventName'];
                        for (const selector of titleSelectors) {
                            const titleEl = element.querySelector(selector);
                            if (titleEl && titleEl.textContent.trim()) {
                                event.title = titleEl.textContent.trim();
                                break;
                            }
                        }
                        
                        // Extract date
                        const dateSelectors = ['.date', '.event-date', '.show-date', 'time'];
                        for (const selector of dateSelectors) {
                            const dateEl = element.querySelector(selector);
                            if (dateEl && dateEl.textContent.trim()) {
                                event.date = dateEl.textContent.trim();
                                break;
                            }
                        }
                        
                        // Extract time
                        const timeSelectors = ['.time', '.event-time', '.show-time'];
                        for (const selector of timeSelectors) {
                            const timeEl = element.querySelector(selector);
                            if (timeEl && timeEl.textContent.trim()) {
                                event.time = timeEl.textContent.trim();
                                break;
                            }
                        }
                        
                        // Only include events with at least a title
                        if (event.title) {
                            events.push(event);
                        }
                        
                    } catch (e) {
                        // Skip problematic event elements
                    }
                }
                
                return events;
            });
        } catch (error) {
            if (this.options.debug) {
                console.warn(chalk.yellow('⚠️  HTML event list extraction failed:'), error.message);
            }
            return [];
        }
    }
}

module.exports = EventScraper;