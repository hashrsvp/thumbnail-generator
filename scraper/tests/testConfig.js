#!/usr/bin/env node

/**
 * Test Configuration for Universal Scraper Testing Framework
 * 
 * Centralized configuration for different testing environments and scenarios
 */

const testConfigurations = {
    // Development testing - fast and focused
    development: {
        headless: false,
        verbose: true,
        timeout: 15000,
        retries: 1,
        enableDebugLogs: true,
        outputDir: './results/dev',
        venueLimit: 2, // Limit venues per category for faster testing
        layerTimeout: 3000
    },
    
    // CI/CD testing - reliable and comprehensive
    ci: {
        headless: true,
        verbose: false,
        timeout: 45000,
        retries: 3,
        enableDebugLogs: false,
        outputDir: './results/ci',
        venueLimit: null, // Test all venues
        layerTimeout: 10000,
        failFast: false // Continue testing even if some venues fail
    },
    
    // Production validation - thorough and reliable
    production: {
        headless: true,
        verbose: true,
        timeout: 60000,
        retries: 3,
        enableDebugLogs: true,
        outputDir: './results/production',
        venueLimit: null,
        layerTimeout: 15000,
        requireHighConfidence: true, // Only pass tests with >80% confidence
        generateDetailedReports: true
    },
    
    // Performance benchmarking - focused on speed metrics
    benchmark: {
        headless: true,
        verbose: false,
        timeout: 30000,
        retries: 1, // Don't retry for consistent timing
        enableDebugLogs: false,
        outputDir: './results/benchmark',
        venueLimit: 3, // Focus on representative venues
        layerTimeout: 5000,
        trackDetailedMetrics: true
    },
    
    // Debug mode - maximum visibility
    debug: {
        headless: false,
        verbose: true,
        timeout: 120000, // Long timeout for manual inspection
        retries: 0, // Don't retry to see exact failure
        enableDebugLogs: true,
        outputDir: './results/debug',
        venueLimit: 1, // One venue at a time
        layerTimeout: 30000,
        pauseOnFailure: true
    }
};

// Hash app specific validation thresholds
const hashValidationThresholds = {
    // Minimum confidence scores required for each field
    minConfidence: {
        title: 60,
        address: 70,
        date: 80,
        venue: 50,
        description: 40,
        category: 85
    },
    
    // Required field validation rules
    requiredFields: {
        title: {
            required: true,
            minLength: 3,
            maxLength: 200,
            validationMessage: 'Title must be 3-200 characters'
        },
        address: {
            required: true,
            mustContainComma: true,
            minLength: 10,
            validationMessage: 'Address must contain comma and be at least 10 characters'
        },
        date: {
            required: true,
            format: 'ISO',
            futureOnly: false, // Allow past dates for testing
            maxDaysFromNow: 730,
            validationMessage: 'Date must be in ISO format and within 2 years'
        },
        venue: {
            required: false,
            minLength: 2,
            maxLength: 100,
            validationMessage: 'Venue name should be 2-100 characters if provided'
        }
    },
    
    // Category validation rules
    categories: {
        validCategories: [
            'Music', 'Festivals', 'Food Events', 'Sports/Games',
            'Comedy Shows', 'Art Shows', 'Bars', 'Nightclubs'
        ],
        maxCategories: 2,
        minCategories: 1,
        requireExactMatch: true
    },
    
    // Time format validation
    timeFormats: {
        startTime: /^\d{2}:\d{2}:\d{2}$/,
        endTime: /^\d{2}:\d{2}:\d{2}$/,
        validationMessage: 'Times must be in HH:mm:ss format'
    }
};

// Performance benchmarks and targets
const performanceTargets = {
    // Overall test suite targets
    suite: {
        maxTotalTime: 1200000, // 20 minutes max for full suite
        maxAverageTime: 8000,   // 8 seconds average per venue
        minSuccessRate: 75,     // 75% minimum success rate
        maxMemoryUsage: 2000    // 2GB max memory usage
    },
    
    // Individual venue targets
    venue: {
        maxTime: 30000,         // 30 seconds max per venue
        minConfidence: 60,      // 60% minimum overall confidence
        maxRetries: 2,          // Max retry attempts
        timeoutWarningThreshold: 15000 // Warn if over 15 seconds
    },
    
    // Layer-specific targets
    layers: {
        maxLayerTime: 5000,     // 5 seconds max per layer
        minSuccessfulLayers: 2, // At least 2 layers should succeed
        structuredDataTarget: 90, // 90% confidence for structured data
        semanticHtmlTarget: 75,   // 75% confidence for semantic HTML
        textPatternTarget: 60     // 60% confidence for text patterns
    },
    
    // Network and resource targets
    network: {
        maxPageSize: 10000000,  // 10MB max page size
        maxRequestCount: 50,    // Max 50 network requests per venue
        maxImageSize: 5000000,  // 5MB max individual image
        timeoutThreshold: 30000 // 30s network timeout
    }
};

// Test data quality thresholds
const qualityThresholds = {
    // Data completeness requirements
    completeness: {
        criticalFields: ['title', 'address', 'date'], // Must have all
        importantFields: ['venue', 'description'],     // Should have most
        optionalFields: ['imageUrl', 'price', 'endDate'], // Nice to have
        
        criticalRequirement: 100, // 100% of critical fields required
        importantRequirement: 70, // 70% of important fields preferred
        optionalRequirement: 30   // 30% of optional fields is good
    },
    
    // Data accuracy validation
    accuracy: {
        addressFormat: {
            requireComma: true,
            requireState: false,
            requireZip: false,
            maxLength: 300
        },
        
        dateValidity: {
            mustBeFuture: false,
            maxYearsFromNow: 2,
            minYearsFromNow: -1,
            requireTime: false
        },
        
        categoryAccuracy: {
            mustMatchExpected: false, // Allow different but valid categories
            penalizeIncorrect: true,
            bonusForExactMatch: 10
        }
    },
    
    // Content quality checks
    content: {
        titleQuality: {
            minWords: 2,
            maxWords: 20,
            avoidAllCaps: true,
            avoidSpecialChars: false
        },
        
        descriptionQuality: {
            minWords: 5,
            maxWords: 500,
            preferHTML: false,
            allowMarkdown: true
        }
    }
};

// Environment-specific venue selections for testing
const venueSelections = {
    // Quick smoke test - one venue per major category
    smoke: {
        music: ['The Fillmore'],
        nightclubs: ['Audio SF'],
        comedy: ['Cobb\'s Comedy Club'],
        sports: ['Oracle Park'],
        bars: ['El Rio SF']
    },
    
    // Regression test - proven reliable venues
    regression: {
        music: ['The Fillmore', 'Great American Music Hall'],
        nightclubs: ['Audio SF', 'Temple SF'],
        comedy: ['Cobb\'s Comedy Club', 'Comedy Mothership'],
        sports: ['Oracle Park', 'Chase Center'],
        bars: ['El Rio SF', 'The Saxon Pub']
    },
    
    // Full coverage - all available venues
    full: 'all',
    
    // Problem venues - known difficult cases
    challenging: {
        music: ['Emo\'s Austin'], // Complex event listing
        nightclubs: ['Kingdom Austin'], // Dynamic content
        comedy: ['San Jose Improv'] // Ticketing integration
    }
};

// Reporter configuration
const reporterConfig = {
    // Console output settings
    console: {
        showProgress: true,
        showDetails: true,
        useColors: true,
        showTimings: true,
        verboseErrors: false
    },
    
    // JSON report settings
    json: {
        includeRawData: false,
        includeScreenshots: false,
        includeBenchmarks: true,
        prettyPrint: true
    },
    
    // HTML report settings
    html: {
        includeCharts: true,
        includeScreenshots: false,
        theme: 'light',
        autoOpen: false,
        includeDebugInfo: true
    },
    
    // File output settings
    files: {
        timestampFormat: 'YYYY-MM-DD-HH-mm-ss',
        keepHistoryCount: 10, // Keep last 10 reports
        compressOldReports: true
    }
};

/**
 * Get configuration for specific environment
 */
function getConfig(environment = 'development') {
    const config = testConfigurations[environment];
    if (!config) {
        throw new Error(`Unknown environment: ${environment}. Available: ${Object.keys(testConfigurations).join(', ')}`);
    }
    
    return {
        ...config,
        hashValidation: hashValidationThresholds,
        performance: performanceTargets,
        quality: qualityThresholds,
        venues: venueSelections,
        reporter: reporterConfig
    };
}

/**
 * Get venue selection for specific test type
 */
function getVenues(selectionType = 'smoke') {
    const selection = venueSelections[selectionType];
    if (!selection) {
        throw new Error(`Unknown venue selection: ${selectionType}. Available: ${Object.keys(venueSelections).join(', ')}`);
    }
    
    return selection;
}

/**
 * Validate configuration
 */
function validateConfig(config) {
    const errors = [];
    
    // Check required properties
    const required = ['headless', 'timeout', 'outputDir'];
    for (const prop of required) {
        if (config[prop] === undefined) {
            errors.push(`Missing required config property: ${prop}`);
        }
    }
    
    // Validate timeout values
    if (config.timeout < 5000) {
        errors.push('Timeout too low (minimum 5000ms recommended)');
    }
    
    if (config.timeout > 300000) {
        errors.push('Timeout very high (>5 minutes may cause issues)');
    }
    
    // Validate retries
    if (config.retries < 0 || config.retries > 5) {
        errors.push('Retries should be between 0-5');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = {
    getConfig,
    getVenues,
    validateConfig,
    testConfigurations,
    hashValidationThresholds,
    performanceTargets,
    qualityThresholds,
    venueSelections,
    reporterConfig
};