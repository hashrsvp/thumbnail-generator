/**
 * ExtractorConfig - Configuration Manager for Universal Extractor
 * 
 * Manages site-specific configurations, patterns, and extraction rules
 * for the UniversalExtractor system.
 * 
 * @author Claude Code
 * @version 2.0.0
 */

const fs = require('fs');
const path = require('path');

class ExtractorConfig {
    constructor(configDir = null) {
        this.configDir = configDir || path.join(__dirname, '../config');
        this.configs = new Map();
        this.globalConfig = this.getDefaultConfig();
        
        // Load all configurations
        this.loadConfigurations();
    }
    
    /**
     * Get default global configuration
     */
    getDefaultConfig() {
        return {
            // Global extraction settings
            extraction: {
                timeout: 30000,
                retries: 3,
                minConfidence: 60,
                preferHighConfidence: true,
                enabledLayers: [1, 2, 3, 4, 5],
                layerTimeout: 5000
            },
            
            // Hash app specific settings
            hashApp: {
                enforceRequirements: true,
                requireAddressComma: true,
                validCategories: [
                    'Music', 'Comedy', 'Arts & Theater', 'Nightlife', 'Food & Drink',
                    'Sports', 'Education', 'Family', 'Community', 'Business'
                ],
                maxCategories: 3,
                defaultCategory: 'Community'
            },
            
            // Confidence thresholds
            confidence: {
                excellent: 90,
                good: 70,
                acceptable: 50,
                poor: 30,
                fieldWeights: {
                    title: 2.0,
                    date: 2.0,
                    address: 1.5,
                    venue: 1.5,
                    description: 1.0,
                    image: 1.0,
                    price: 0.8
                }
            },
            
            // Layer-specific settings
            layers: {
                1: { // Structured Data Layer
                    enabled: true,
                    priority: 1,
                    timeout: 5000,
                    supportedFormats: ['json-ld', 'microdata', 'rdfa'],
                    eventSchemas: [
                        'Event', 'SocialEvent', 'BusinessEvent', 'ChildrensEvent',
                        'ComedyEvent', 'CourseInstance', 'DanceEvent', 'DeliveryEvent',
                        'EducationEvent', 'ExhibitionEvent', 'Festival', 'FoodEvent',
                        'LiteraryEvent', 'MusicEvent', 'PublicationEvent', 'SaleEvent',
                        'ScreeningEvent', 'SportsEvent', 'TheaterEvent', 'VisualArtsEvent'
                    ]
                },
                2: { // Meta Tag Layer
                    enabled: true,
                    priority: 2,
                    timeout: 3000,
                    supportedTypes: ['opengraph', 'twitter', 'standard']
                },
                3: { // Semantic HTML Layer
                    enabled: true,
                    priority: 3,
                    timeout: 8000,
                    maxSelectors: 50
                },
                4: { // Text Pattern Layer
                    enabled: true,
                    priority: 4,
                    timeout: 10000,
                    maxTextLength: 100000
                },
                5: { // Content Analysis Layer
                    enabled: true,
                    priority: 5,
                    timeout: 15000,
                    strategies: ['content_priority', 'context_analysis', 'intelligent_defaults']
                }
            },
            
            // Image extraction settings
            images: {
                maxImages: 10,
                minWidth: 200,
                minHeight: 150,
                preferredRatios: [
                    { min: 0.8, max: 1.25, bonus: 10 }, // Square-ish (good for events)
                    { min: 0.6, max: 0.8, bonus: 5 }    // Portrait
                ],
                priorityClasses: [
                    'hero', 'featured', 'main', 'primary', 'event',
                    'banner', 'poster', 'flyer'
                ],
                excludeClasses: [
                    'logo', 'icon', 'avatar', 'thumbnail', 'nav',
                    'advertisement', 'ad', 'sponsor'
                ]
            },
            
            // Debug and logging
            debug: {
                enabled: false,
                verbose: false,
                logLayers: true,
                logConfidence: true,
                logMerging: false
            }
        };
    }
    
    /**
     * Load all configuration files from config directory
     */
    loadConfigurations() {
        try {
            if (!fs.existsSync(this.configDir)) {
                console.warn(`Config directory not found: ${this.configDir}`);
                return;
            }
            
            const files = fs.readdirSync(this.configDir)
                .filter(file => file.endsWith('.json'));
            
            for (const file of files) {
                try {
                    const siteName = path.basename(file, '.json');
                    const configPath = path.join(this.configDir, file);
                    const siteConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    
                    this.configs.set(siteName, this.mergeWithDefaults(siteConfig));
                    
                } catch (error) {
                    console.warn(`Failed to load config for ${file}:`, error.message);
                }
            }
            
            console.log(`Loaded ${this.configs.size} site configurations`);
            
        } catch (error) {
            console.warn('Failed to load configurations:', error.message);
        }
    }
    
    /**
     * Get configuration for a specific site or URL
     */
    getConfigForSite(urlOrSite) {
        let siteName;
        
        if (urlOrSite.startsWith('http')) {
            try {
                const hostname = new URL(urlOrSite).hostname.toLowerCase();
                siteName = this.detectSiteFromHostname(hostname);
            } catch (error) {
                siteName = 'generic';
            }
        } else {
            siteName = urlOrSite.toLowerCase();
        }
        
        return this.configs.get(siteName) || 
               this.configs.get('generic') || 
               this.globalConfig;
    }
    
    /**
     * Detect site type from hostname
     */
    detectSiteFromHostname(hostname) {
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
            foursquare: /foursquare\./,
            yelp: /yelp\./,
            timeout: /timeout\./,
            eventful: /eventful\./
        };
        
        for (const [siteName, pattern] of Object.entries(sitePatterns)) {
            if (pattern.test(hostname)) {
                return siteName;
            }
        }
        
        return 'generic';
    }
    
    /**
     * Merge site-specific config with defaults
     */
    mergeWithDefaults(siteConfig) {
        return this.deepMerge(this.globalConfig, siteConfig);
    }
    
    /**
     * Deep merge configuration objects
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const [key, value] of Object.entries(source)) {
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = this.deepMerge(result[key] || {}, value);
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }
    
    /**
     * Get extraction patterns for a specific site
     */
    getExtractionPatterns(siteName) {
        const config = this.getConfigForSite(siteName);
        return config.patterns || this.getDefaultPatterns();
    }
    
    /**
     * Get default extraction patterns
     */
    getDefaultPatterns() {
        return {
            title: {
                selectors: [
                    'h1[class*="event"]',
                    'h1[class*="title"]',
                    '[class*="event-title"]',
                    '[class*="event-name"]',
                    '[data-testid*="title"]',
                    'h1',
                    'meta[property="og:title"]'
                ],
                confidence: [90, 85, 95, 95, 90, 70, 80]
            },
            
            description: {
                selectors: [
                    '[class*="event-description"]',
                    '[class*="description"]',
                    '[class*="about"]',
                    '[class*="summary"]',
                    'meta[property="og:description"]',
                    '[class*="event-details"]'
                ],
                confidence: [95, 80, 75, 75, 70, 85]
            },
            
            venue: {
                selectors: [
                    '[class*="venue-name"]',
                    '[class*="venue"]',
                    '[class*="location-name"]',
                    '[data-testid*="venue"]',
                    '[itemprop="location"] [itemprop="name"]'
                ],
                confidence: [95, 85, 90, 95, 90]
            },
            
            address: {
                selectors: [
                    '[class*="venue-address"]',
                    '[class*="address"]',
                    '[class*="location-address"]',
                    '[data-testid*="address"]',
                    'address',
                    '[itemprop="location"] [itemprop="address"]'
                ],
                confidence: [95, 80, 90, 95, 85, 90]
            },
            
            date: {
                selectors: [
                    'time[datetime]',
                    '[class*="event-date"]',
                    '[class*="date"]',
                    '[data-testid*="date"]',
                    '[itemprop="startDate"]'
                ],
                confidence: [98, 90, 75, 95, 95]
            },
            
            time: {
                selectors: [
                    '[class*="event-time"]',
                    '[class*="start-time"]',
                    '[class*="time"]',
                    'time',
                    '[data-testid*="time"]'
                ],
                confidence: [95, 98, 70, 80, 95]
            },
            
            price: {
                selectors: [
                    '[class*="price"]',
                    '[class*="cost"]',
                    '[class*="ticket-price"]',
                    '[data-testid*="price"]',
                    '[class*="admission"]',
                    '[itemprop="offers"] [itemprop="price"]'
                ],
                confidence: [90, 85, 98, 95, 80, 95]
            },
            
            image: {
                selectors: [
                    '[class*="event-image"] img',
                    '[class*="hero-image"] img',
                    '[class*="featured-image"] img',
                    '[class*="main-image"] img',
                    '[data-testid*="image"] img',
                    'meta[property="og:image"]',
                    '[itemprop="image"]'
                ],
                confidence: [98, 95, 95, 95, 90, 85, 90]
            }
        };
    }
    
    /**
     * Get site-specific selectors
     */
    getSiteSelectors(siteName) {
        const config = this.getConfigForSite(siteName);
        return config.selectors || {};
    }
    
    /**
     * Get category mapping rules for a site
     */
    getCategoryMappings(siteName) {
        const config = this.getConfigForSite(siteName);
        return config.categoryMappings || this.getDefaultCategoryMappings();
    }
    
    /**
     * Get default category mappings
     */
    getDefaultCategoryMappings() {
        return {
            'Music': [
                'concert', 'music', 'band', 'singer', 'dj', 'festival', 
                'acoustic', 'jazz', 'rock', 'pop', 'classical', 'electronic',
                'hip hop', 'country', 'blues', 'folk', 'reggae', 'punk'
            ],
            'Comedy': [
                'comedy', 'comedian', 'standup', 'improv', 'funny', 'humor',
                'laugh', 'joke', 'comic', 'sketch'
            ],
            'Arts & Theater': [
                'theater', 'theatre', 'play', 'art', 'gallery', 'exhibition',
                'dance', 'ballet', 'opera', 'musical', 'drama', 'performance art',
                'sculpture', 'painting', 'photography'
            ],
            'Nightlife': [
                'party', 'club', 'bar', 'nightlife', 'drinks', 'dancing',
                'cocktail', 'lounge', 'happy hour', 'karaoke'
            ],
            'Food & Drink': [
                'food', 'restaurant', 'wine', 'beer', 'tasting', 'cooking',
                'chef', 'dining', 'brunch', 'dinner', 'lunch', 'cocktail',
                'brewery', 'winery', 'culinary'
            ],
            'Sports': [
                'sport', 'game', 'match', 'tournament', 'race', 'competition',
                'team', 'football', 'basketball', 'baseball', 'soccer',
                'tennis', 'golf', 'running', 'cycling'
            ],
            'Education': [
                'workshop', 'seminar', 'class', 'course', 'lecture', 'training',
                'learn', 'study', 'school', 'university', 'conference',
                'tutorial', 'certification'
            ],
            'Family': [
                'family', 'kids', 'children', 'child', 'parent', 'baby',
                'toddler', 'playground', 'story time', 'puppet show'
            ],
            'Community': [
                'community', 'volunteer', 'charity', 'fundraiser', 'neighborhood',
                'local', 'town hall', 'meeting', 'cleanup', 'social'
            ],
            'Business': [
                'business', 'networking', 'conference', 'meeting', 'professional',
                'corporate', 'entrepreneur', 'startup', 'trade show'
            ]
        };
    }
    
    /**
     * Validate and normalize configuration
     */
    validateConfig(config) {
        const errors = [];
        const warnings = [];
        
        // Check required sections
        const requiredSections = ['extraction', 'hashApp', 'confidence'];
        for (const section of requiredSections) {
            if (!config[section]) {
                errors.push(`Missing required section: ${section}`);
            }
        }
        
        // Validate confidence thresholds
        if (config.confidence) {
            const thresholds = ['excellent', 'good', 'acceptable', 'poor'];
            for (const threshold of thresholds) {
                const value = config.confidence[threshold];
                if (typeof value !== 'number' || value < 0 || value > 100) {
                    errors.push(`Invalid confidence threshold: ${threshold} = ${value}`);
                }
            }
        }
        
        // Validate layer configuration
        if (config.layers) {
            for (const [layerNum, layerConfig] of Object.entries(config.layers)) {
                if (!layerConfig.enabled === undefined) {
                    warnings.push(`Layer ${layerNum} missing 'enabled' property`);
                }
                
                if (layerConfig.timeout && typeof layerConfig.timeout !== 'number') {
                    errors.push(`Layer ${layerNum} timeout must be a number`);
                }
            }
        }
        
        return { errors, warnings, isValid: errors.length === 0 };
    }
    
    /**
     * Export configuration for debugging
     */
    exportConfig(siteName = null) {
        if (siteName) {
            return this.getConfigForSite(siteName);
        }
        
        return {
            global: this.globalConfig,
            sites: Object.fromEntries(this.configs)
        };
    }
    
    /**
     * Update configuration at runtime
     */
    updateConfig(siteName, updates) {
        const currentConfig = this.getConfigForSite(siteName);
        const updatedConfig = this.deepMerge(currentConfig, updates);
        
        this.configs.set(siteName, updatedConfig);
        
        return updatedConfig;
    }
    
    /**
     * Save configuration to file
     */
    saveConfig(siteName, config) {
        const configPath = path.join(this.configDir, `${siteName}.json`);
        
        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            this.configs.set(siteName, config);
            return true;
        } catch (error) {
            console.error(`Failed to save config for ${siteName}:`, error.message);
            return false;
        }
    }
}

module.exports = ExtractorConfig;