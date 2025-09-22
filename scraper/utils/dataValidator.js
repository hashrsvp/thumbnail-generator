/**
 * Data Validation and Fixing System for Hash App Scraper
 * 
 * Ensures all scraped event data meets Hash app requirements with:
 * - Smart category mapping
 * - Address formatting with comma insertion
 * - Date/time format conversion
 * - Field completion with intelligent defaults
 * - Confidence scoring and error reporting
 * 
 * @author Hash App Development Team
 * @version 1.0.0
 */

// Native JavaScript Date handling - moment.js replaced for lightweight implementation

/**
 * Hash App allowed categories - MUST match exactly
 */
const HASH_CATEGORIES = [
    'Music',
    'Festivals', 
    'Food Events',
    'Sports/Games',
    'Comedy Shows',
    'Art Shows',
    'Bars',
    'Nightclubs'
];

/**
 * Category mapping intelligence - maps scraped categories to Hash categories
 */
const CATEGORY_MAPPINGS = {
    // Music mappings
    'music': 'Music',
    'concert': 'Music',
    'live music': 'Music',
    'band': 'Music',
    'singer': 'Music',
    'acoustic': 'Music',
    'rock': 'Music',
    'jazz': 'Music',
    'blues': 'Music',
    'country': 'Music',
    'pop': 'Music',
    'hip hop': 'Music',
    'electronic': 'Music',
    'dj': 'Music',
    'karaoke': 'Music',
    'open mic': 'Music',
    'musical': 'Music',
    'orchestra': 'Music',
    'choir': 'Music',
    
    // Festival mappings
    'festival': 'Festivals',
    'fest': 'Festivals',
    'celebration': 'Festivals',
    'fair': 'Festivals',
    'carnival': 'Festivals',
    'outdoor event': 'Festivals',
    'cultural event': 'Festivals',
    'street festival': 'Festivals',
    'music festival': 'Festivals',
    'food festival': 'Festivals',
    'arts festival': 'Festivals',
    
    // Food Events mappings
    'food': 'Food Events',
    'dining': 'Food Events',
    'restaurant': 'Food Events',
    'cooking': 'Food Events',
    'chef': 'Food Events',
    'culinary': 'Food Events',
    'tasting': 'Food Events',
    'wine tasting': 'Food Events',
    'beer tasting': 'Food Events',
    'food truck': 'Food Events',
    'brunch': 'Food Events',
    'dinner': 'Food Events',
    'buffet': 'Food Events',
    'cuisine': 'Food Events',
    'menu': 'Food Events',
    'breakfast': 'Food Events',
    'lunch': 'Food Events',
    
    // Sports/Games mappings
    'sports': 'Sports/Games',
    'game': 'Sports/Games',
    'gaming': 'Sports/Games',
    'tournament': 'Sports/Games',
    'competition': 'Sports/Games',
    'match': 'Sports/Games',
    'football': 'Sports/Games',
    'basketball': 'Sports/Games',
    'baseball': 'Sports/Games',
    'soccer': 'Sports/Games',
    'tennis': 'Sports/Games',
    'golf': 'Sports/Games',
    'volleyball': 'Sports/Games',
    'hockey': 'Sports/Games',
    'bowling': 'Sports/Games',
    'pool': 'Sports/Games',
    'billiards': 'Sports/Games',
    'darts': 'Sports/Games',
    'trivia': 'Sports/Games',
    'quiz': 'Sports/Games',
    'bingo': 'Sports/Games',
    'poker': 'Sports/Games',
    'cards': 'Sports/Games',
    'board game': 'Sports/Games',
    'video game': 'Sports/Games',
    'esports': 'Sports/Games',
    
    // Comedy mappings
    'comedy': 'Comedy Shows',
    'comedian': 'Comedy Shows',
    'stand up': 'Comedy Shows',
    'standup': 'Comedy Shows',
    'funny': 'Comedy Shows',
    'humor': 'Comedy Shows',
    'improv': 'Comedy Shows',
    'sketch': 'Comedy Shows',
    'roast': 'Comedy Shows',
    'comedy show': 'Comedy Shows',
    'comedy night': 'Comedy Shows',
    'open mic comedy': 'Comedy Shows',
    
    // Art Shows mappings
    'art': 'Art Shows',
    'gallery': 'Art Shows',
    'exhibition': 'Art Shows',
    'painting': 'Art Shows',
    'sculpture': 'Art Shows',
    'photography': 'Art Shows',
    'artist': 'Art Shows',
    'creative': 'Art Shows',
    'craft': 'Art Shows',
    'pottery': 'Art Shows',
    'drawing': 'Art Shows',
    'design': 'Art Shows',
    'fashion': 'Art Shows',
    'theater': 'Art Shows',
    'theatre': 'Art Shows',
    'play': 'Art Shows',
    'drama': 'Art Shows',
    'dance': 'Art Shows',
    'ballet': 'Art Shows',
    'performance': 'Art Shows',
    'installation': 'Art Shows',
    'museum': 'Art Shows',
    
    // Bars mappings
    'bar': 'Bars',
    'pub': 'Bars',
    'tavern': 'Bars',
    'brewery': 'Bars',
    'brewhouse': 'Bars',
    'taproom': 'Bars',
    'cocktail': 'Bars',
    'happy hour': 'Bars',
    'drinks': 'Bars',
    'beer': 'Bars',
    'wine bar': 'Bars',
    'sports bar': 'Bars',
    'dive bar': 'Bars',
    'lounge': 'Bars',
    'speakeasy': 'Bars',
    'rooftop bar': 'Bars',
    
    // Nightclub mappings
    'nightclub': 'Nightclubs',
    'club': 'Nightclubs',
    'dance club': 'Nightclubs',
    'dancing': 'Nightclubs',
    'dj set': 'Nightclubs',
    'electronic music': 'Nightclubs',
    'house music': 'Nightclubs',
    'techno': 'Nightclubs',
    'rave': 'Nightclubs',
    'party': 'Nightclubs',
    'late night': 'Nightclubs',
    'dance floor': 'Nightclubs',
    'vip': 'Nightclubs'
};

/**
 * US State mappings for address validation
 */
const US_STATES = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

/**
 * Major US cities for intelligent address completion
 */
const MAJOR_CITIES = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio',
    'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus',
    'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington', 'Boston',
    'El Paso', 'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis',
    'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Mesa',
    'Sacramento', 'Atlanta', 'Kansas City', 'Colorado Springs', 'Omaha', 'Raleigh', 'Miami',
    'Long Beach', 'Virginia Beach', 'Oakland', 'Minneapolis', 'Tulsa', 'Tampa', 'Arlington'
];

/**
 * Validation result structure
 */
class ValidationResult {
    constructor() {
        this.isValid = true;
        this.fixes = [];
        this.errors = [];
        this.warnings = [];
        this.confidenceScore = 100;
        this.data = null;
    }
    
    addFix(field, oldValue, newValue, reason, confidence = 100) {
        this.fixes.push({
            field,
            oldValue,
            newValue,
            reason,
            confidence
        });
        this.confidenceScore = Math.min(this.confidenceScore, confidence);
    }
    
    addError(field, message, value = null) {
        this.errors.push({ field, message, value });
        this.isValid = false;
    }
    
    addWarning(field, message, value = null) {
        this.warnings.push({ field, message, value });
    }
}

/**
 * Main Data Validator Class
 */
class DataValidator {
    constructor(options = {}) {
        this.options = {
            strictMode: options.strictMode || false,
            autoFix: options.autoFix !== false,
            minConfidenceScore: options.minConfidenceScore || 70,
            defaultCity: options.defaultCity || 'Austin',
            defaultState: options.defaultState || 'TX',
            ...options
        };
    }
    
    /**
     * Main validation method
     * @param {Object} eventData - Raw scraped event data
     * @returns {ValidationResult} - Validation result with fixes and errors
     */
    validate(eventData) {
        const result = new ValidationResult();
        
        try {
            // Create a deep copy of the data to avoid mutations
            const data = JSON.parse(JSON.stringify(eventData));
            
            // Validate and fix each field
            this.validateTitle(data, result);
            this.validateDescription(data, result);
            this.validateCategory(data, result);
            this.validateAddress(data, result);
            this.validateDates(data, result);
            this.validateTimes(data, result);
            this.validatePrice(data, result);
            this.validateUrl(data, result);
            this.validateImage(data, result);
            this.validateVenue(data, result);
            
            // Set the validated data
            result.data = data;
            
            // Check if confidence score meets minimum requirements
            if (result.confidenceScore < this.options.minConfidenceScore) {
                result.addError('confidence', `Confidence score ${result.confidenceScore}% below minimum ${this.options.minConfidenceScore}%`);
            }
            
        } catch (error) {
            result.addError('validation', `Validation failed: ${error.message}`);
        }
        
        return result;
    }
    
    /**
     * Validate and fix event title
     */
    validateTitle(data, result) {
        if (!data.title || typeof data.title !== 'string') {
            if (this.options.autoFix) {
                data.title = 'Event at ' + (data.venue || 'Venue TBD');
                result.addFix('title', data.title || null, data.title, 'Generated default title', 50);
            } else {
                result.addError('title', 'Title is required');
            }
        } else {
            // Clean up title
            const cleanTitle = data.title.trim().replace(/\s+/g, ' ');
            if (cleanTitle !== data.title) {
                data.title = cleanTitle;
                result.addFix('title', data.title, cleanTitle, 'Cleaned title whitespace', 95);
            }
            
            // Check title length
            if (data.title.length > 100) {
                const truncated = data.title.substring(0, 97) + '...';
                data.title = truncated;
                result.addFix('title', data.title, truncated, 'Truncated long title', 80);
            }
        }
    }
    
    /**
     * Validate and fix event description
     */
    validateDescription(data, result) {
        if (!data.description || typeof data.description !== 'string') {
            if (this.options.autoFix) {
                data.description = `Join us at ${data.venue || 'this venue'} for ${data.title || 'an exciting event'}!`;
                result.addFix('description', data.description || null, data.description, 'Generated default description', 40);
            } else {
                result.addWarning('description', 'Description is recommended');
            }
        } else {
            // Clean up description
            const cleanDesc = data.description.trim().replace(/\s+/g, ' ');
            if (cleanDesc !== data.description) {
                data.description = cleanDesc;
                result.addFix('description', data.description, cleanDesc, 'Cleaned description whitespace', 95);
            }
        }
    }
    
    /**
     * Validate and fix event categories array using intelligent mapping
     */
    validateCategory(data, result) {
        const originalCategories = data.categories;
        
        // Handle both legacy single category and new categories array
        if (data.category && !data.categories) {
            data.categories = [data.category];
            delete data.category;
        }
        
        if (!data.categories || !Array.isArray(data.categories) || data.categories.length === 0) {
            // Try to infer category from title and description
            const inferredCategory = this.inferCategory(data);
            if (inferredCategory) {
                data.categories = [inferredCategory.category];
                result.addFix('categories', originalCategories, data.categories, 
                    `Inferred from: ${inferredCategory.reason}`, inferredCategory.confidence);
            } else {
                data.categories = ['Music']; // Default fallback
                result.addFix('categories', originalCategories, data.categories, 'Used default category', 30);
            }
        } else {
            // Validate and filter categories array
            const validCategories = [];
            const invalidCategories = [];
            
            // Process each category in the array
            for (const category of data.categories) {
                if (typeof category !== 'string') {
                    invalidCategories.push(category);
                    continue;
                }
                
                const trimmedCategory = category.trim();
                
                // Check if category is valid
                if (HASH_CATEGORIES.includes(trimmedCategory)) {
                    validCategories.push(trimmedCategory);
                } else {
                    // Try to map invalid category
                    const mappedCategory = this.mapCategory(trimmedCategory);
                    if (mappedCategory) {
                        validCategories.push(mappedCategory.category);
                        result.addFix('categories', trimmedCategory, mappedCategory.category, 
                            `Mapped "${trimmedCategory}" to "${mappedCategory.category}"`, mappedCategory.confidence);
                    } else {
                        invalidCategories.push(trimmedCategory);
                    }
                }
            }
            
            // Report invalid categories
            if (invalidCategories.length > 0) {
                result.addWarning('categories', 
                    `Filtered out invalid categories: ${invalidCategories.join(', ')}. Valid categories are: ${HASH_CATEGORIES.join(', ')}`,
                    invalidCategories);
            }
            
            // Ensure we have at least one valid category
            if (validCategories.length === 0) {
                // Try to infer from other fields
                const inferredCategory = this.inferCategory(data);
                if (inferredCategory) {
                    validCategories.push(inferredCategory.category);
                    result.addFix('categories', originalCategories, validCategories, 
                        `No valid categories found, inferred: ${inferredCategory.category}`, inferredCategory.confidence);
                } else {
                    validCategories.push('Music');
                    result.addFix('categories', originalCategories, validCategories, 
                        'No valid categories found, used default: Music', 30);
                }
            }
            
            // Enforce maximum 2 categories rule
            if (validCategories.length > 2) {
                const truncatedCategories = validCategories.slice(0, 2);
                result.addFix('categories', validCategories, truncatedCategories, 
                    `Limited to maximum 2 categories (removed: ${validCategories.slice(2).join(', ')})`, 80);
                validCategories.splice(2);
            }
            
            // Remove duplicates while preserving order
            const uniqueCategories = [...new Set(validCategories)];
            if (uniqueCategories.length !== validCategories.length) {
                result.addFix('categories', validCategories, uniqueCategories, 
                    'Removed duplicate categories', 90);
            }
            
            data.categories = uniqueCategories;
            
            // Report changes made
            if (JSON.stringify(originalCategories) !== JSON.stringify(data.categories)) {
                if (!result.fixes.some(fix => fix.field === 'categories')) {
                    result.addFix('categories', originalCategories, data.categories, 
                        'Validated and cleaned categories array', 85);
                }
            }
        }
    }
    
    /**
     * Intelligent category inference from event data
     */
    inferCategory(data) {
        const textToAnalyze = [
            data.title || '',
            data.description || '',
            data.venue || '',
            (data.tags || []).join(' ')
        ].join(' ').toLowerCase();
        
        // Score each category based on keyword matches
        const categoryScores = {};
        
        for (const [keyword, category] of Object.entries(CATEGORY_MAPPINGS)) {
            if (textToAnalyze.includes(keyword)) {
                categoryScores[category] = (categoryScores[category] || 0) + keyword.length;
            }
        }
        
        // Find the highest scoring category
        let bestCategory = null;
        let bestScore = 0;
        
        for (const [category, score] of Object.entries(categoryScores)) {
            if (score > bestScore) {
                bestCategory = category;
                bestScore = score;
            }
        }
        
        if (bestCategory && bestScore > 0) {
            return {
                category: bestCategory,
                confidence: Math.min(90, 50 + bestScore * 5), // Scale confidence
                reason: `text analysis (score: ${bestScore})`
            };
        }
        
        return null;
    }
    
    /**
     * Map scraped category to Hash category
     */
    mapCategory(scrapedCategory) {
        const normalized = scrapedCategory.toLowerCase().trim();
        
        // Direct mapping
        if (CATEGORY_MAPPINGS[normalized]) {
            return {
                category: CATEGORY_MAPPINGS[normalized],
                confidence: 95
            };
        }
        
        // Partial matching
        for (const [keyword, category] of Object.entries(CATEGORY_MAPPINGS)) {
            if (normalized.includes(keyword) || keyword.includes(normalized)) {
                return {
                    category: category,
                    confidence: 80
                };
            }
        }
        
        return null;
    }
    
    /**
     * Validate and fix address formatting
     */
    validateAddress(data, result) {
        const originalAddress = data.address;
        
        if (!data.address || typeof data.address !== 'string') {
            if (this.options.autoFix) {
                data.address = `${data.venue || 'Venue'}, ${this.options.defaultCity}, ${this.options.defaultState}`;
                result.addFix('address', originalAddress, data.address, 'Generated default address', 30);
            } else {
                result.addError('address', 'Address is required');
            }
        } else {
            // Clean address
            let cleanAddress = data.address.trim().replace(/\s+/g, ' ');
            
            // Check if address contains commas
            if (!cleanAddress.includes(',')) {
                // Try to format as "Venue, City, State"
                const formatted = this.formatAddress(cleanAddress, data);
                if (formatted) {
                    cleanAddress = formatted.address;
                    result.addFix('address', originalAddress, cleanAddress, 
                        formatted.reason, formatted.confidence);
                } else {
                    // Add default city and state
                    cleanAddress = `${cleanAddress}, ${this.options.defaultCity}, ${this.options.defaultState}`;
                    result.addFix('address', originalAddress, cleanAddress, 
                        'Added default city and state', 40);
                }
            }
            
            data.address = cleanAddress;
        }
    }
    
    /**
     * Intelligent address formatting
     */
    formatAddress(address, data) {
        // Check if it's just a venue name
        if (data.venue && address === data.venue) {
            return {
                address: `${address}, ${this.options.defaultCity}, ${this.options.defaultState}`,
                reason: 'Added city and state to venue name',
                confidence: 60
            };
        }
        
        // Check if it contains a known city
        const addressLower = address.toLowerCase();
        for (const city of MAJOR_CITIES) {
            if (addressLower.includes(city.toLowerCase())) {
                // Extract parts before the city as venue
                const cityIndex = addressLower.indexOf(city.toLowerCase());
                const venue = address.substring(0, cityIndex).trim();
                const remainder = address.substring(cityIndex).trim();
                
                if (venue) {
                    return {
                        address: `${venue}, ${remainder}`,
                        reason: `Identified city: ${city}`,
                        confidence: 85
                    };
                }
            }
        }
        
        // Try to identify if it has state abbreviation
        const words = address.split(/\s+/);
        const lastWord = words[words.length - 1].toUpperCase();
        
        if (Object.values(US_STATES).includes(lastWord)) {
            // Has state, check if we can add commas intelligently
            if (words.length >= 3) {
                // Assume: venue + city + state
                const state = words.pop();
                const city = words.pop();
                const venue = words.join(' ');
                
                return {
                    address: `${venue}, ${city}, ${state}`,
                    reason: 'Formatted venue, city, state',
                    confidence: 80
                };
            }
        }
        
        return null;
    }
    
    /**
     * Validate and fix date formats
     */
    validateDates(data, result) {
        this.validateDate(data, result, 'startDate', true);
        this.validateDate(data, result, 'endDate', false);
        
        // Ensure end date is after start date
        if (data.startDate && data.endDate) {
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            
            if (end.isBefore(start)) {
                data.endDate = data.startDate;
                result.addFix('endDate', data.endDate, data.startDate, 
                    'End date cannot be before start date', 70);
            }
        }
    }
    
    /**
     * Validate individual date field
     */
    validateDate(data, result, fieldName, required = false) {
        const originalValue = data[fieldName];
        
        if (!data[fieldName]) {
            if (required) {
                if (this.options.autoFix) {
                    // Default to tomorrow at 7 PM
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(19, 0, 0, 0);
                    data[fieldName] = tomorrow.toISOString();
                    result.addFix(fieldName, originalValue, data[fieldName], 
                        'Generated default date (tomorrow 7 PM)', 30);
                } else {
                    result.addError(fieldName, `${fieldName} is required`);
                }
            }
            return;
        }
        
        // Try to parse the date
        let parsedDate = new Date(data[fieldName]);
        
        if (!parsedDate.isValid()) {
            // Try common date formats
            const formats = [
                'YYYY-MM-DD',
                'MM/DD/YYYY',
                'DD/MM/YYYY',
                'YYYY-MM-DD HH:mm',
                'MM/DD/YYYY HH:mm',
                'MMMM DD, YYYY',
                'MMM DD, YYYY',
                'YYYY-MM-DD HH:mm:ss'
            ];
            
            for (const format of formats) {
                // Try parsing with the specific format using native JS
                parsedDate = new Date(data[fieldName]);
                if (!isNaN(parsedDate.getTime())) {
                    break;
                }
            }
            
            if (!parsedDate.isValid()) {
                result.addError(fieldName, `Invalid date format: ${data[fieldName]}`);
                return;
            }
        }
        
        // Convert to ISO format
        const isoDate = parsedDate.toISOString();
        if (data[fieldName] !== isoDate) {
            data[fieldName] = isoDate;
            result.addFix(fieldName, originalValue, isoDate, 
                'Converted to ISO format', 90);
        }
        
        // Check if date is in the past (warning only)
        if (parsedDate < new Date()) {
            result.addWarning(fieldName, 'Date is in the past', data[fieldName]);
        }
    }
    
    /**
     * Validate and fix time formats
     */
    validateTimes(data, result) {
        this.validateTime(data, result, 'startTime');
        this.validateTime(data, result, 'endTime');
    }
    
    /**
     * Validate individual time field
     */
    validateTime(data, result, fieldName) {
        const originalValue = data[fieldName];
        
        if (!data[fieldName]) {
            return; // Time is optional
        }
        
        // Check if already in HH:mm:ss format
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
        if (timeRegex.test(data[fieldName])) {
            return; // Already valid
        }
        
        // Try to parse various time formats
        const timeFormats = [
            'HH:mm',
            'h:mm A',
            'h:mm a',
            'HH:mm:ss',
            'h:mm:ss A',
            'h:mm:ss a'
        ];
        
        let parsedTime = null;
        for (const format of timeFormats) {
            const testTime = new Date(data[fieldName]);
            if (!isNaN(testTime.getTime())) {
                parsedTime = testTime;
                break;
            }
        }
        
        if (parsedTime) {
            const formattedTime = parsedTime.format('HH:mm:ss');
            data[fieldName] = formattedTime;
            result.addFix(fieldName, originalValue, formattedTime, 
                'Converted to HH:mm:ss format', 85);
        } else {
            result.addError(fieldName, `Invalid time format: ${data[fieldName]}`);
        }
    }
    
    /**
     * Validate and fix price information
     */
    validatePrice(data, result) {
        if (data.price !== undefined && data.price !== null) {
            const originalPrice = data.price;
            
            // Convert to number if string
            if (typeof data.price === 'string') {
                // Extract numeric value
                const numericMatch = data.price.match(/[\d.]+/);
                if (numericMatch) {
                    data.price = parseFloat(numericMatch[0]);
                    result.addFix('price', originalPrice, data.price, 
                        'Extracted numeric price', 80);
                } else if (data.price.toLowerCase().includes('free')) {
                    data.price = 0;
                    result.addFix('price', originalPrice, 0, 
                        'Converted "free" to 0', 95);
                } else {
                    data.price = null;
                    result.addFix('price', originalPrice, null, 
                        'Could not parse price, set to null', 50);
                }
            }
            
            // Validate numeric price
            if (typeof data.price === 'number') {
                if (data.price < 0) {
                    data.price = 0;
                    result.addFix('price', originalPrice, 0, 
                        'Negative price converted to 0', 70);
                }
                
                // Round to 2 decimal places
                const rounded = Math.round(data.price * 100) / 100;
                if (rounded !== data.price) {
                    data.price = rounded;
                    result.addFix('price', originalPrice, rounded, 
                        'Rounded to 2 decimal places', 90);
                }
            }
        }
    }
    
    /**
     * Validate URL format
     */
    validateUrl(data, result) {
        if (data.url && typeof data.url === 'string') {
            try {
                new URL(data.url);
                // URL is valid
            } catch (error) {
                result.addError('url', `Invalid URL format: ${data.url}`);
            }
        }
    }
    
    /**
     * Validate image URL
     */
    validateImage(data, result) {
        if (data.image && typeof data.image === 'string') {
            try {
                new URL(data.image);
                // Check if it's likely an image URL
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
                const hasImageExtension = imageExtensions.some(ext => 
                    data.image.toLowerCase().includes(ext));
                
                if (!hasImageExtension) {
                    result.addWarning('image', 'URL may not be an image', data.image);
                }
            } catch (error) {
                result.addError('image', `Invalid image URL format: ${data.image}`);
            }
        }
    }
    
    /**
     * Validate venue information
     */
    validateVenue(data, result) {
        if (!data.venue || typeof data.venue !== 'string') {
            if (this.options.autoFix) {
                data.venue = 'Venue TBD';
                result.addFix('venue', data.venue || null, 'Venue TBD', 
                    'Generated default venue name', 30);
            } else {
                result.addWarning('venue', 'Venue name is recommended');
            }
        } else {
            // Clean venue name
            const cleanVenue = data.venue.trim().replace(/\s+/g, ' ');
            if (cleanVenue !== data.venue) {
                data.venue = cleanVenue;
                result.addFix('venue', data.venue, cleanVenue, 
                    'Cleaned venue name', 95);
            }
        }
    }
    
    /**
     * Generate validation report
     */
    generateReport(result) {
        const report = {
            summary: {
                isValid: result.isValid,
                confidenceScore: result.confidenceScore,
                fixesApplied: result.fixes.length,
                errorsFound: result.errors.length,
                warningsFound: result.warnings.length
            },
            fixes: result.fixes,
            errors: result.errors,
            warnings: result.warnings
        };
        
        return report;
    }
    
    /**
     * Validate multiple events in batch
     */
    validateBatch(eventsArray) {
        const results = [];
        const summary = {
            total: eventsArray.length,
            valid: 0,
            invalid: 0,
            totalFixes: 0,
            totalErrors: 0,
            totalWarnings: 0,
            averageConfidence: 0
        };
        
        let totalConfidence = 0;
        
        for (const event of eventsArray) {
            const result = this.validate(event);
            results.push(result);
            
            if (result.isValid) {
                summary.valid++;
            } else {
                summary.invalid++;
            }
            
            summary.totalFixes += result.fixes.length;
            summary.totalErrors += result.errors.length;
            summary.totalWarnings += result.warnings.length;
            totalConfidence += result.confidenceScore;
        }
        
        summary.averageConfidence = Math.round(totalConfidence / eventsArray.length);
        
        return {
            results,
            summary
        };
    }
}

module.exports = {
    DataValidator,
    ValidationResult,
    HASH_CATEGORIES,
    CATEGORY_MAPPINGS,
    US_STATES,
    MAJOR_CITIES
};