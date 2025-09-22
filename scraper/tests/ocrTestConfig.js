#!/usr/bin/env node

/**
 * OCR Test Configuration for Hash Event Scraper
 * 
 * Comprehensive configuration for testing OCR functionality across
 * different image types, text patterns, and accuracy requirements.
 */

// OCR Test Environment Configurations
const ocrTestConfigurations = {
    // Fast development testing
    development: {
        headless: false,
        verbose: true,
        timeout: 30000,
        retries: 1,
        enableDebugLogs: true,
        outputDir: './results/ocr/dev',
        imageLimit: 3, // Limit images for faster testing
        ocrTimeout: 15000,
        saveProcessedImages: true
    },
    
    // CI/CD testing
    ci: {
        headless: true,
        verbose: false,
        timeout: 60000,
        retries: 3,
        enableDebugLogs: false,
        outputDir: './results/ocr/ci',
        imageLimit: null, // Test all images
        ocrTimeout: 30000,
        saveProcessedImages: false,
        failFast: false
    },
    
    // Production validation
    production: {
        headless: true,
        verbose: true,
        timeout: 120000,
        retries: 3,
        enableDebugLogs: true,
        outputDir: './results/ocr/production',
        imageLimit: null,
        ocrTimeout: 45000,
        requireHighAccuracy: true, // Only pass tests with >85% accuracy
        generateDetailedReports: true,
        saveProcessedImages: true
    },
    
    // Performance benchmarking
    benchmark: {
        headless: true,
        verbose: false,
        timeout: 90000,
        retries: 1,
        enableDebugLogs: false,
        outputDir: './results/ocr/benchmark',
        imageLimit: 10, // Representative sample
        ocrTimeout: 20000,
        trackDetailedMetrics: true,
        measureMemoryUsage: true,
        warmupIterations: 2
    },
    
    // Debug mode for OCR troubleshooting
    debug: {
        headless: false,
        verbose: true,
        timeout: 300000, // 5 minutes for manual inspection
        retries: 0,
        enableDebugLogs: true,
        outputDir: './results/ocr/debug',
        imageLimit: 1,
        ocrTimeout: 60000,
        pauseOnFailure: true,
        saveIntermediateSteps: true,
        showOcrBoundingBoxes: true
    }
};

// OCR Accuracy and Quality Thresholds
const ocrQualityThresholds = {
    // Minimum OCR accuracy requirements by text type
    accuracy: {
        eventTitle: {
            minAccuracy: 85,
            confidenceThreshold: 0.8,
            validationMessage: 'Event titles must be extracted with >85% accuracy'
        },
        dateTime: {
            minAccuracy: 90,
            confidenceThreshold: 0.85,
            validationMessage: 'Date/time information must be highly accurate'
        },
        venueAddress: {
            minAccuracy: 80,
            confidenceThreshold: 0.75,
            validationMessage: 'Venue addresses should be reasonably accurate'
        },
        priceInfo: {
            minAccuracy: 95,
            confidenceThreshold: 0.9,
            validationMessage: 'Price information must be extremely accurate'
        },
        generalText: {
            minAccuracy: 70,
            confidenceThreshold: 0.7,
            validationMessage: 'General text should meet minimum readability'
        }
    },
    
    // Text pattern validation rules
    patterns: {
        eventTitle: {
            minLength: 3,
            maxLength: 200,
            allowSpecialChars: true,
            avoidPatterns: [/^\s*$/, /^[\d\s\-\/]+$/] // Avoid empty or date-only strings
        },
        dateTime: {
            requiredPatterns: [
                /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // MM/DD/YYYY
                /\b\d{1,2}-\d{1,2}-\d{2,4}\b/,  // MM-DD-YYYY
                /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i, // Month names
                /\b\d{1,2}:\d{2}\s*(AM|PM)\b/i // Time
            ],
            validationMessage: 'Date/time should match expected patterns'
        },
        venueAddress: {
            requiredPatterns: [
                /\b\d+\s+[A-Za-z\s]+/, // Street number and name
                /\b(St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive)\b/i // Street types
            ],
            minWords: 3,
            validationMessage: 'Address should contain street information'
        },
        priceInfo: {
            requiredPatterns: [
                /\$\d+/, // Dollar amounts
                /\bfree\b/i, // Free events
                /\b\d+\s*dollars?\b/i // Written amounts
            ],
            validationMessage: 'Price should be in recognizable format'
        }
    }
};

// Flyer Type Classifications and Expected Content
const flyerTypeConfigurations = {
    // Concert/Music Event Flyers
    concert: {
        expectedElements: {
            title: { required: true, priority: 'high', confidence: 0.85 },
            artistName: { required: true, priority: 'high', confidence: 0.8 },
            venue: { required: true, priority: 'high', confidence: 0.75 },
            date: { required: true, priority: 'critical', confidence: 0.9 },
            time: { required: true, priority: 'high', confidence: 0.8 },
            price: { required: false, priority: 'medium', confidence: 0.7 },
            ageRestriction: { required: false, priority: 'low', confidence: 0.6 }
        },
        commonTextPatterns: {
            artistNames: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
            genres: /\b(rock|pop|jazz|blues|electronic|hip.?hop|country|folk)\b/gi,
            venues: /\b(theater|theatre|hall|club|bar|arena|stadium)\b/gi,
            tickets: /\b(tickets|tix|admission)\b/gi
        },
        qualityIndicators: {
            hasLargeTitle: 10,
            hasMultipleArtists: 5,
            hasVenueInfo: 15,
            hasTicketInfo: 8,
            hasContactInfo: 3
        }
    },
    
    // Nightlife/Club Event Flyers
    nightlife: {
        expectedElements: {
            eventName: { required: true, priority: 'high', confidence: 0.8 },
            djNames: { required: false, priority: 'medium', confidence: 0.7 },
            venue: { required: true, priority: 'high', confidence: 0.8 },
            date: { required: true, priority: 'critical', confidence: 0.9 },
            time: { required: true, priority: 'high', confidence: 0.8 },
            ageRestriction: { required: true, priority: 'high', confidence: 0.85 },
            dresscode: { required: false, priority: 'low', confidence: 0.6 }
        },
        commonTextPatterns: {
            djNames: /\bDJ\s+[A-Za-z\s]+/gi,
            eventTypes: /\b(night|party|celebration|bash|rave)\b/gi,
            ageRestrictions: /\b(21\+|18\+|all\s*ages)\b/gi,
            timePatterns: /\b\d{1,2}(:\d{2})?\s*(pm|am)\b/gi
        },
        qualityIndicators: {
            hasEventBranding: 12,
            hasAgeRestriction: 15,
            hasDressCode: 5,
            hasMultipleDJs: 8,
            hasVenueInfo: 15
        }
    },
    
    // Comedy Show Flyers
    comedy: {
        expectedElements: {
            showTitle: { required: true, priority: 'high', confidence: 0.85 },
            comedianNames: { required: true, priority: 'high', confidence: 0.8 },
            venue: { required: true, priority: 'high', confidence: 0.8 },
            date: { required: true, priority: 'critical', confidence: 0.9 },
            showTimes: { required: true, priority: 'high', confidence: 0.85 },
            ticketPrice: { required: false, priority: 'medium', confidence: 0.75 },
            minimumAge: { required: false, priority: 'medium', confidence: 0.7 }
        },
        commonTextPatterns: {
            comedianNames: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
            showTypes: /\b(standup|improv|comedy|show)\b/gi,
            showtimes: /\b\d{1,2}(:\d{2})?\s*(pm|am)\b/gi,
            drinkMinimum: /\b\d+\s*drink\s*minimum\b/gi
        },
        qualityIndicators: {
            hasComedianHeadliner: 15,
            hasMultipleShows: 8,
            hasVenueInfo: 12,
            hasTicketInfo: 10,
            hasAgeRestriction: 5
        }
    },
    
    // Sports Event Flyers
    sports: {
        expectedElements: {
            eventTitle: { required: true, priority: 'high', confidence: 0.85 },
            teams: { required: true, priority: 'high', confidence: 0.8 },
            venue: { required: true, priority: 'critical', confidence: 0.9 },
            date: { required: true, priority: 'critical', confidence: 0.95 },
            gameTime: { required: true, priority: 'critical', confidence: 0.9 },
            ticketInfo: { required: false, priority: 'medium', confidence: 0.7 },
            season: { required: false, priority: 'low', confidence: 0.6 }
        },
        commonTextPatterns: {
            teams: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(vs?\.?|@|at)\s+[A-Z][a-z]+/gi,
            sports: /\b(baseball|basketball|football|soccer|hockey|tennis)\b/gi,
            venues: /\b(stadium|arena|field|court|park)\b/gi,
            gameTypes: /\b(regular\s*season|playoff|championship|preseason)\b/gi
        },
        qualityIndicators: {
            hasTeamNames: 20,
            hasVenueInfo: 15,
            hasGameTime: 18,
            hasSeasonInfo: 5,
            hasTicketPrices: 8
        }
    },
    
    // Food Event Flyers
    food: {
        expectedElements: {
            eventName: { required: true, priority: 'high', confidence: 0.8 },
            cuisine: { required: false, priority: 'medium', confidence: 0.7 },
            chef: { required: false, priority: 'medium', confidence: 0.7 },
            venue: { required: true, priority: 'high', confidence: 0.8 },
            date: { required: true, priority: 'critical', confidence: 0.9 },
            time: { required: true, priority: 'high', confidence: 0.8 },
            price: { required: false, priority: 'medium', confidence: 0.75 }
        },
        commonTextPatterns: {
            cuisines: /\b(italian|mexican|asian|french|american|fusion)\b/gi,
            eventTypes: /\b(tasting|dinner|brunch|festival|market)\b/gi,
            chefs: /\bchef\s+[A-Za-z\s]+/gi,
            menuItems: /\b(appetizer|entree|dessert|wine\s*pairing)\b/gi
        },
        qualityIndicators: {
            hasCuisineType: 10,
            hasChefName: 8,
            hasMenuDetails: 12,
            hasPriceInfo: 10,
            hasVenueInfo: 15
        }
    }
};

// Performance Benchmarks for OCR Operations
const ocrPerformanceTargets = {
    // Processing time targets
    timing: {
        maxImageDownload: 5000,     // 5 seconds max to download image
        maxImagePreprocess: 3000,   // 3 seconds max for preprocessing
        maxOcrExtraction: 15000,    // 15 seconds max for OCR
        maxTextAnalysis: 2000,      // 2 seconds max for text analysis
        maxTotalTime: 25000,        // 25 seconds total per image
        warnThreshold: 20000        // Warn if over 20 seconds
    },
    
    // Memory usage targets
    memory: {
        maxImageMemory: 50000000,   // 50MB max for image processing
        maxOcrMemory: 100000000,    // 100MB max during OCR
        maxTotalMemory: 200000000,  // 200MB max total
        memoryLeakThreshold: 10000000 // Warn if 10MB+ not released
    },
    
    // Accuracy benchmarks
    accuracy: {
        minOverallAccuracy: 75,     // 75% minimum overall
        targetAccuracy: 85,         // 85% target accuracy
        excellentAccuracy: 95,      // 95% excellent threshold
        minConfidence: 0.7,         // Minimum confidence score
        targetConfidence: 0.8       // Target confidence score
    },
    
    // Success rate targets
    reliability: {
        minSuccessRate: 80,         // 80% of images should process successfully
        targetSuccessRate: 90,      // 90% target success rate
        maxRetryRate: 15,           // Max 15% should require retries
        maxFailureRate: 10          // Max 10% complete failures
    }
};

// Test Image Categories and Sample Paths
const testImageSamples = {
    // High quality, clear text samples
    highQuality: {
        concert: 'fixtures/images/concert_high_quality.jpg',
        nightlife: 'fixtures/images/nightlife_high_quality.png',
        comedy: 'fixtures/images/comedy_high_quality.jpg',
        sports: 'fixtures/images/sports_high_quality.png',
        food: 'fixtures/images/food_high_quality.jpg'
    },
    
    // Medium quality samples with some challenges
    mediumQuality: {
        concert: 'fixtures/images/concert_medium_quality.jpg',
        nightlife: 'fixtures/images/nightlife_medium_quality.png',
        comedy: 'fixtures/images/comedy_medium_quality.jpg',
        sports: 'fixtures/images/sports_medium_quality.png',
        food: 'fixtures/images/food_medium_quality.jpg'
    },
    
    // Challenging samples (poor quality, stylized fonts, etc.)
    challenging: {
        stylizedFonts: 'fixtures/images/stylized_fonts.jpg',
        lowResolution: 'fixtures/images/low_resolution.png',
        poorContrast: 'fixtures/images/poor_contrast.jpg',
        rotatedText: 'fixtures/images/rotated_text.jpg',
        multipleLanguages: 'fixtures/images/multiple_languages.png',
        handwritten: 'fixtures/images/handwritten_text.jpg'
    },
    
    // Edge cases and error conditions
    edgeCases: {
        noText: 'fixtures/images/no_text_image.jpg',
        corruptedImage: 'fixtures/images/corrupted.jpg',
        veryLargeImage: 'fixtures/images/very_large.png',
        emptyImage: 'fixtures/images/empty.jpg'
    }
};

// Expected OCR Results for Test Images (Ground Truth)
const groundTruthData = {
    'concert_high_quality.jpg': {
        title: 'LIVE MUSIC NIGHT',
        artist: 'The Electric Band',
        venue: 'Blue Note Jazz Club',
        date: '12/15/2024',
        time: '8:00 PM',
        price: '$25',
        accuracy: 95
    },
    'nightlife_high_quality.png': {
        eventName: 'SATURDAY NIGHT PARTY',
        dj: 'DJ PULSE',
        venue: 'Club Revolution',
        date: '12/21/2024',
        time: '10:00 PM',
        age: '21+',
        accuracy: 92
    },
    // Additional ground truth data would be defined here...
};

// Integration Test Configurations
const integrationTestConfig = {
    // Universal Extractor integration
    universalExtractor: {
        enableOcrFallback: true,
        ocrPriority: 3, // After structured data, meta tags, semantic HTML
        ocrConfidenceWeight: 0.6, // Lower weight than structured extraction
        mergeStrategy: 'supplement', // Supplement other extraction methods
        conflictResolution: 'highest_confidence'
    },
    
    // Image Handler integration
    imageHandler: {
        preprocessImages: true,
        resizeForOcr: true,
        enhanceContrast: true,
        maxImageSize: 2048, // Max dimension for OCR processing
        supportedFormats: ['jpg', 'jpeg', 'png', 'webp']
    },
    
    // Firebase integration
    firebase: {
        storeOcrResults: false, // Don't store OCR results in production
        cacheOcrResults: true,  // Cache results for testing
        logOcrMetrics: true     // Log performance metrics
    }
};

/**
 * Get OCR test configuration for specific environment
 */
function getOcrConfig(environment = 'development') {
    const config = ocrTestConfigurations[environment];
    if (!config) {
        throw new Error(`Unknown OCR test environment: ${environment}. Available: ${Object.keys(ocrTestConfigurations).join(', ')}`);
    }
    
    return {
        ...config,
        quality: ocrQualityThresholds,
        flyerTypes: flyerTypeConfigurations,
        performance: ocrPerformanceTargets,
        testImages: testImageSamples,
        groundTruth: groundTruthData,
        integration: integrationTestConfig
    };
}

/**
 * Get flyer type configuration
 */
function getFlyerTypeConfig(flyerType) {
    const config = flyerTypeConfigurations[flyerType];
    if (!config) {
        throw new Error(`Unknown flyer type: ${flyerType}. Available: ${Object.keys(flyerTypeConfigurations).join(', ')}`);
    }
    return config;
}

/**
 * Validate OCR test configuration
 */
function validateOcrConfig(config) {
    const errors = [];
    
    // Check required properties
    const required = ['timeout', 'ocrTimeout', 'outputDir'];
    for (const prop of required) {
        if (config[prop] === undefined) {
            errors.push(`Missing required OCR config property: ${prop}`);
        }
    }
    
    // Validate timeout values
    if (config.ocrTimeout > config.timeout) {
        errors.push('OCR timeout should not exceed overall timeout');
    }
    
    // Validate accuracy thresholds
    if (config.quality?.accuracy) {
        for (const [field, settings] of Object.entries(config.quality.accuracy)) {
            if (settings.minAccuracy < 0 || settings.minAccuracy > 100) {
                errors.push(`Invalid accuracy threshold for ${field}: ${settings.minAccuracy}`);
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = {
    getOcrConfig,
    getFlyerTypeConfig,
    validateOcrConfig,
    ocrTestConfigurations,
    ocrQualityThresholds,
    flyerTypeConfigurations,
    ocrPerformanceTargets,
    testImageSamples,
    groundTruthData,
    integrationTestConfig
};
