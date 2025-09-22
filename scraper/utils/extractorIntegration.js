/**
 * ExtractorIntegration - Integration layer for Universal Extractor
 * 
 * Integrates the UniversalExtractor with existing EventScraper system
 * and provides backwards compatibility and enhanced functionality.
 * 
 * @author Claude Code
 * @version 2.0.0
 */

const UniversalExtractor = require('./universalExtractor');
const ExtractorConfig = require('./extractorConfig');
const { 
    DataValidator, 
    TextProcessor, 
    DateTimeProcessor,
    PriceProcessor,
    ImageProcessor,
    Logger,
    PerformanceTracker 
} = require('./extractorHelpers');

const chalk = require('chalk');

/**
 * Integration wrapper for Universal Extractor
 * Provides enhanced extraction capabilities to existing scrapers
 */
class ExtractorIntegration {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            // Integration settings
            fallbackToLegacy: options.fallbackToLegacy !== false,
            enhanceResults: options.enhanceResults !== false,
            validateResults: options.validateResults !== false,
            
            // Extraction settings  
            useUniversalExtractor: options.useUniversalExtractor !== false,
            confidenceThreshold: options.confidenceThreshold || 50,
            
            // Debug settings
            debug: options.debug || false,
            verbose: options.verbose || false,
            logPerformance: options.logPerformance || false,
            
            ...options
        };
        
        // Initialize components
        this.config = new ExtractorConfig();
        this.logger = new Logger(this.options);
        this.performance = new PerformanceTracker();
        
        // Cache for results
        this.cache = new Map();
    }
    
    /**
     * Main extraction method - enhanced version of legacy scraping
     */
    async extractEventData(url = null, siteType = null) {
        this.performance.start('total_extraction');
        this.logger.log('Starting enhanced event data extraction...');
        
        try {
            // Detect site type if not provided
            if (!siteType) {
                siteType = this.detectSiteType(url || this.page.url());
            }
            
            // Get site-specific configuration
            const siteConfig = this.config.getConfigForSite(siteType);
            this.logger.debug(`Using configuration for site: ${siteType}`);
            
            // Initialize Universal Extractor with site config
            const extractor = new UniversalExtractor(this.page, {
                ...this.options,
                ...siteConfig,
                debug: this.options.debug,
                verbose: this.options.verbose
            });
            
            // Extract data using Universal Extractor
            this.performance.start('universal_extraction');
            const universalResults = await extractor.extract();
            this.performance.end('universal_extraction');
            
            this.logger.debug(`Universal extraction completed with ${universalResults.metadata.totalConfidence}% confidence`);
            
            // Enhance results with legacy methods if needed
            let enhancedResults = universalResults;
            
            if (this.options.enhanceResults) {
                this.performance.start('result_enhancement');
                enhancedResults = await this.enhanceResults(universalResults, siteType);
                this.performance.end('result_enhancement');
            }
            
            // Validate results
            if (this.options.validateResults) {
                this.performance.start('result_validation');
                const validation = await this.validateResults(enhancedResults);
                enhancedResults.validation = validation;
                this.performance.end('result_validation');
                
                if (!validation.isValid && validation.errors.length > 0) {
                    this.logger.warn('Validation errors found:', validation.errors);
                }
            }
            
            // Convert to legacy format for backwards compatibility
            const legacyFormat = this.convertToLegacyFormat(enhancedResults);
            
            this.performance.end('total_extraction');
            
            if (this.options.logPerformance) {
                this.performance.logMetrics();
            }
            
            this.logger.success(`Extraction completed successfully (${this.performance.getMetric('total_extraction')}ms)`);
            
            return {
                ...legacyFormat,
                // Include additional metadata for advanced users
                _metadata: {
                    extractor: 'UniversalExtractor',
                    version: '2.0.0',
                    siteType: siteType,
                    totalConfidence: enhancedResults.metadata.totalConfidence,
                    layersUsed: enhancedResults.metadata.layersUsed,
                    extractionTime: this.performance.getMetric('total_extraction'),
                    validation: enhancedResults.validation
                }
            };
            
        } catch (error) {
            this.logger.error('Enhanced extraction failed:', error.message);
            
            // Fallback to legacy extraction if enabled
            if (this.options.fallbackToLegacy) {
                this.logger.log('Attempting fallback to legacy extraction...');
                return await this.fallbackExtraction(siteType);
            }
            
            throw error;
        }
    }
    
    /**
     * Site type detection with enhanced patterns
     */
    detectSiteType(url) {
        if (!url) return 'generic';
        
        try {
            const hostname = new URL(url).hostname.toLowerCase();
            
            const sitePatterns = {
                eventbrite: /eventbrite\./,
                ticketmaster: /ticketmaster\./,
                facebook: /(facebook\.|fb\.|m\.facebook\.)/,
                meetup: /meetup\./,
                do512: /do512\./,
                sfstation: /sfstation\./,
                funcheap: /funcheap\./,
                universe: /universe\./,
                brownpapertickets: /brownpapertickets\./,
                bandsintown: /bandsintown\./,
                songkick: /songkick\./,
                dice: /dice\.fm/,
                resident_advisor: /residentadvisor\./,
                timeout: /timeout\./,
                eventful: /eventful\./,
                yelp: /yelp\./,
                foursquare: /foursquare\./
            };
            
            for (const [siteName, pattern] of Object.entries(sitePatterns)) {
                if (pattern.test(hostname)) {
                    return siteName;
                }
            }
            
            return 'generic';
            
        } catch (error) {
            return 'generic';
        }
    }
    
    /**
     * Enhance extraction results with additional processing
     */
    async enhanceResults(results, siteType) {
        this.logger.debug('Enhancing extraction results...');
        
        const enhanced = { ...results };
        
        // Enhance image selection
        if (enhanced.data.imageUrls && enhanced.data.imageUrls.length > 1) {
            const bestImages = ImageProcessor.selectBestImages(
                enhanced.data.imageUrls, 
                5
            );
            
            if (bestImages.length > 0) {
                enhanced.data.imageUrls = bestImages;
                enhanced.data.imageUrl = bestImages[0];
                
                this.logger.debug(`Selected ${bestImages.length} best images from ${results.data.imageUrls.length} candidates`);
            }
        }
        
        // Enhance date/time processing
        if (enhanced.data.date) {
            const dateValidation = DateTimeProcessor.isWithinRange(enhanced.data.date);
            if (!dateValidation) {
                this.logger.warn('Date appears to be outside reasonable range:', enhanced.data.date);
                enhanced.confidence.date = Math.max(0, (enhanced.confidence.date || 0) - 20);
            }
        }
        
        // Enhance price processing
        if (enhanced.data.price) {
            const priceData = PriceProcessor.parsePrice(enhanced.data.price);
            if (priceData) {
                enhanced.data.free = priceData.free;
                enhanced.data.priceAmount = priceData.amount;
                enhanced.data.currency = priceData.currency;
                enhanced.data.price = PriceProcessor.formatPrice(priceData);
            }
        }
        
        // Enhance text fields
        const textFields = ['title', 'description', 'venue', 'address'];
        for (const field of textFields) {
            if (enhanced.data[field]) {
                enhanced.data[field] = TextProcessor.cleanText(enhanced.data[field]);
            }
        }
        
        // Add site-specific enhancements
        await this.applySiteSpecificEnhancements(enhanced, siteType);
        
        return enhanced;
    }
    
    /**
     * Apply site-specific enhancements
     */
    async applySiteSpecificEnhancements(results, siteType) {
        switch (siteType) {
            case 'eventbrite':
                await this.enhanceEventbriteResults(results);
                break;
                
            case 'facebook':
                await this.enhanceFacebookResults(results);
                break;
                
            case 'meetup':
                await this.enhanceMeetupResults(results);
                break;
                
            default:
                // Generic enhancements
                await this.enhanceGenericResults(results);
        }
    }
    
    /**
     * Eventbrite-specific enhancements
     */
    async enhanceEventbriteResults(results) {
        // Eventbrite often has very high-quality structured data
        if (results.layerResults[1] && results.layerResults[1].data.title) {
            // Boost confidence for structured data from Eventbrite
            Object.keys(results.layerResults[1].confidence).forEach(field => {
                results.layerResults[1].confidence[field] = Math.min(100, 
                    (results.layerResults[1].confidence[field] || 0) + 5
                );
            });
        }
        
        // Extract additional Eventbrite-specific fields
        try {
            // Check for sold out status
            const soldOutElement = await this.page.locator('.js-hide-sold-out').first();
            if (await soldOutElement.count() > 0) {
                results.data.soldOut = true;
                results.confidence.soldOut = 95;
            }
            
            // Extract organizer information
            const organizerElement = await this.page.locator('[data-spec="event-organizer-name"]').first();
            if (await organizerElement.count() > 0) {
                const organizer = await organizerElement.textContent();
                if (organizer) {
                    results.data.organizer = organizer.trim();
                    results.confidence.organizer = 90;
                }
            }
            
        } catch (error) {
            // Continue if enhancements fail
        }
    }
    
    /**
     * Facebook-specific enhancements
     */
    async enhanceFacebookResults(results) {
        // Facebook requires special handling due to dynamic content
        try {
            // Wait for content to load
            await this.page.waitForTimeout(2000);
            
            // Extract Facebook-specific elements
            const eventTimeElement = await this.page.locator('[data-testid="event-time"]').first();
            if (await eventTimeElement.count() > 0) {
                const timeText = await eventTimeElement.textContent();
                if (timeText) {
                    const parsedTime = DateTimeProcessor.parseFlexibleTime(timeText);
                    if (parsedTime) {
                        results.data.startTime = parsedTime;
                        results.confidence.startTime = 85;
                    }
                }
            }
            
        } catch (error) {
            // Continue if enhancements fail
        }
    }
    
    /**
     * Meetup-specific enhancements
     */
    async enhanceMeetupResults(results) {
        try {
            // Meetup events are usually free unless specified
            if (results.data.free === undefined) {
                results.data.free = true;
                results.confidence.free = 70;
            }
            
            // Extract attendee count
            const attendeeElement = await this.page.locator('[data-testid="attendee-count"]').first();
            if (await attendeeElement.count() > 0) {
                const attendeeText = await attendeeElement.textContent();
                const attendeeCount = TextProcessor.extractNumbers(attendeeText);
                if (attendeeCount.length > 0) {
                    results.data.attendeeCount = attendeeCount[0];
                    results.confidence.attendeeCount = 80;
                }
            }
            
        } catch (error) {
            // Continue if enhancements fail
        }
    }
    
    /**
     * Generic enhancements for unknown sites
     */
    async enhanceGenericResults(results) {
        // Apply generic improvements
        
        // Try to extract contact information
        try {
            const pageText = await this.page.textContent('body');
            
            // Extract emails
            const emails = TextProcessor.extractEmails(pageText);
            if (emails.length > 0) {
                results.data.contactEmail = emails[0];
                results.confidence.contactEmail = 60;
            }
            
            // Extract phone numbers
            const phones = TextProcessor.extractPhoneNumbers(pageText);
            if (phones.length > 0) {
                results.data.contactPhone = phones[0];
                results.confidence.contactPhone = 60;
            }
            
        } catch (error) {
            // Continue if extraction fails
        }
    }
    
    /**
     * Validate extraction results
     */
    async validateResults(results) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            score: 0
        };
        
        // Check required fields
        const requiredFields = ['title', 'date', 'address'];
        for (const field of requiredFields) {
            if (!results.data[field]) {
                validation.errors.push(`Missing required field: ${field}`);
                validation.isValid = false;
            } else {
                // Validate field content
                const fieldValidation = this.validateField(field, results.data[field]);
                if (!fieldValidation.isValid) {
                    validation.warnings.push(`Invalid ${field}: ${fieldValidation.reason}`);
                }
            }
        }
        
        // Check confidence levels
        const lowConfidenceFields = [];
        for (const [field, confidence] of Object.entries(results.confidence)) {
            if (confidence < this.options.confidenceThreshold) {
                lowConfidenceFields.push(`${field} (${confidence}%)`);
            }
        }
        
        if (lowConfidenceFields.length > 0) {
            validation.warnings.push(`Low confidence fields: ${lowConfidenceFields.join(', ')}`);
        }
        
        // Calculate overall validation score
        validation.score = results.metadata.totalConfidence;
        
        return validation;
    }
    
    /**
     * Validate individual field values
     */
    validateField(fieldName, value) {
        switch (fieldName) {
            case 'title':
                if (!value || value.length < 3) {
                    return { isValid: false, reason: 'Title too short' };
                }
                if (value.length > 200) {
                    return { isValid: false, reason: 'Title too long' };
                }
                break;
                
            case 'date':
                if (!DataValidator.isValidDate(value)) {
                    return { isValid: false, reason: 'Invalid date format' };
                }
                break;
                
            case 'address':
                if (!DataValidator.isValidAddress(value)) {
                    return { isValid: false, reason: 'Invalid address format' };
                }
                break;
                
            case 'imageUrl':
                if (!DataValidator.isValidImageUrl(value)) {
                    return { isValid: false, reason: 'Invalid image URL' };
                }
                break;
                
            case 'email':
                if (!DataValidator.isValidEmail(value)) {
                    return { isValid: false, reason: 'Invalid email format' };
                }
                break;
        }
        
        return { isValid: true };
    }
    
    /**
     * Convert Universal Extractor results to legacy format
     */
    convertToLegacyFormat(results) {
        const legacy = {
            // Core event data
            title: results.data.title || 'Event Title TBD',
            description: results.data.description || 'Event details to be announced.',
            venue: results.data.venue || 'Venue TBD',
            rawLocation: results.data.address || 'Address TBD',
            date: results.data.date,
            startTime: results.data.startTime || '19:00:00',
            endTime: results.data.endTime,
            endDate: results.data.endDate,
            
            // Image data
            imageUrl: results.data.imageUrl,
            imageUrls: results.data.imageUrls || (results.data.imageUrl ? [results.data.imageUrl] : []),
            
            // Price and availability
            free: results.data.free !== undefined ? results.data.free : false,
            soldOut: results.data.soldOut !== undefined ? results.data.soldOut : false,
            
            // Additional fields
            categories: results.data.categories || ['Community'],
            ticketsLink: results.data.ticketsLink,
            sourceUrl: this.page.url(),
            
            // Metadata
            scrapedAt: new Date().toISOString(),
            confidence: results.metadata.totalConfidence
        };
        
        // Add any additional extracted fields
        const additionalFields = [
            'organizer', 'performers', 'contactEmail', 'contactPhone',
            'attendeeCount', 'maxAttendees', 'priceAmount', 'currency'
        ];
        
        for (const field of additionalFields) {
            if (results.data[field] !== undefined) {
                legacy[field] = results.data[field];
            }
        }
        
        return legacy;
    }
    
    /**
     * Fallback to legacy extraction methods
     */
    async fallbackExtraction(siteType) {
        this.logger.warn('Using fallback extraction methods...');
        
        // Implement basic fallback extraction
        const fallbackData = {
            title: 'Event Title TBD',
            description: 'Event details to be announced.',
            venue: 'Venue TBD',
            rawLocation: 'Address TBD',
            date: new Date().toISOString(),
            startTime: '19:00:00',
            imageUrls: [],
            free: false,
            soldOut: false,
            categories: ['Community'],
            sourceUrl: this.page.url(),
            scrapedAt: new Date().toISOString(),
            confidence: 25
        };
        
        try {
            // Try basic title extraction
            const title = await this.page.textContent('h1');
            if (title && title.trim()) {
                fallbackData.title = title.trim();
                fallbackData.confidence = 40;
            }
            
            // Try basic image extraction
            const ogImage = await this.page.getAttribute('meta[property="og:image"]', 'content');
            if (ogImage && DataValidator.isValidImageUrl(ogImage)) {
                fallbackData.imageUrl = ogImage;
                fallbackData.imageUrls = [ogImage];
                fallbackData.confidence = Math.max(fallbackData.confidence, 35);
            }
            
        } catch (error) {
            // Use defaults
        }
        
        return fallbackData;
    }
    
    /**
     * Get extraction statistics
     */
    getStats() {
        return {
            performanceMetrics: this.performance.getAllMetrics(),
            cacheSize: this.cache.size,
            lastExtraction: this.lastExtraction
        };
    }
    
    /**
     * Clear cache and reset
     */
    reset() {
        this.cache.clear();
        this.performance.clear();
    }
}

module.exports = ExtractorIntegration;