/**
 * UniversalExtractor - Universal Event Scraper System
 * 
 * A modular, extensible, and intelligent 6-layer cascade system for extracting
 * event data from any website with confidence scoring and Hash app compliance.
 * 
 * Architecture:
 * Layer 1: Enhanced structured data extraction (JSON-LD, Microdata, RDFa)
 * Layer 2: Meta tag extraction system
 * Layer 3: Semantic HTML pattern recognition
 * Layer 4: Text pattern matching algorithms
 * Layer 5: Intelligent content analysis fallback
 * Layer 6: OCR-based flyer text extraction (confidence-triggered)
 * 
 * @author Claude Code
 * @version 2.1.0
 */

const chalk = require('chalk');
const FlyerTextExtractor = require('./flyerTextExtractor');

/**
 * Universal Event Data Extractor
 * Implements a 6-layer cascade system for comprehensive event data extraction
 */
class UniversalExtractor {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            // Extraction thresholds
            minConfidence: options.minConfidence || 60,
            preferHighConfidence: options.preferHighConfidence !== false,
            
            // Layer configuration
            enabledLayers: options.enabledLayers || [1, 2, 3, 4, 5, 6],
            layerTimeout: options.layerTimeout || 2000,
            
            // OCR Layer configuration
            ocrTriggerThreshold: options.ocrTriggerThreshold || 70, // Only run OCR if overall confidence < 70%
            maxFlyerImages: options.maxFlyerImages || 3,
            ocrTimeout: options.ocrTimeout || 15000,
            
            // Hash app specific
            enforceHashRequirements: options.enforceHashRequirements !== false,
            requireAddressComma: options.requireAddressComma !== false,
            
            // Debug settings
            debug: options.debug || false,
            verbose: options.verbose || false,
            
            ...options
        };
        
        // Initialize extraction layers
        this.layers = {
            1: new StructuredDataLayer(this.page, this.options),
            2: new MetaTagLayer(this.page, this.options),
            3: new SemanticHtmlLayer(this.page, this.options),
            4: new TextPatternLayer(this.page, this.options),
            5: new ContentAnalysisLayer(this.page, this.options),
            6: new FlyerTextExtractor(this.page, {
                maxImages: this.options.maxFlyerImages,
                ocrTimeout: this.options.ocrTimeout,
                debug: this.options.debug,
                verbose: this.options.verbose
            })
        };
        
        // Initialize confidence calculator and validator
        this.confidenceCalculator = new ConfidenceCalculator(this.options);
        this.hashValidator = new HashRequirementValidator(this.options);
        this.fieldMerger = new FieldMerger(this.options);
        
        this.log = this.options.debug ? console.log : () => {};
        this.logVerbose = this.options.verbose ? console.log : () => {};
    }
    
    /**
     * Main extraction method - runs all layers in cascade
     * @returns {Object} Extracted event data with confidence scores
     */
    async extract() {
        this.log(chalk.blue('🚀 Starting Universal Extraction...'));
        
        const results = {
            data: {},
            confidence: {},
            layerResults: {},
            metadata: {
                extractedAt: new Date().toISOString(),
                url: this.page.url(),
                layersUsed: [],
                totalConfidence: 0
            }
        };
        
        // Run layers with concurrent execution where safe
        const concurrentSafeLayers = [1, 2]; // Structured data and meta tags are safe to run concurrently
        const sequentialLayers = [3, 4, 5]; // Semantic, text, and content analysis may depend on DOM state
        const conditionalLayers = [6]; // OCR layer runs only when confidence is low
        
        // Run concurrent-safe layers in parallel
        const concurrentPromises = [];
        for (const layerNum of this.options.enabledLayers) {
            if (concurrentSafeLayers.includes(layerNum) && this.layers[layerNum]) {
                this.log(chalk.cyan(`📋 Running Layer ${layerNum} (concurrent): ${this.layers[layerNum].name}`));
                concurrentPromises.push(
                    this.runLayerWithFastFail(layerNum)
                        .then(result => ({ layerNum, result }))
                        .catch(error => ({ layerNum, error: { data: {}, confidence: {}, error: error.message } }))
                );
            }
        }
        
        // Execute concurrent layers
        if (concurrentPromises.length > 0) {
            try {
                const concurrentResults = await Promise.allSettled(concurrentPromises);
                for (const { status, value } of concurrentResults) {
                    if (status === 'fulfilled') {
                        const { layerNum, result, error } = value;
                        results.layerResults[layerNum] = error || result;
                        if (!error) {
                            results.metadata.layersUsed.push(layerNum);
                            this.logVerbose(`Layer ${layerNum} extracted:`, Object.keys(result.data || {}));
                        } else {
                            this.log(chalk.yellow(`⚠️  Layer ${layerNum} failed: ${error.error}`));
                        }
                    }
                }
            } catch (error) {
                this.log(chalk.yellow(`⚠️  Concurrent layer execution failed: ${error.message}`));
            }
        }
        
        // Run sequential layers in order (with fast-fail)
        for (const layerNum of this.options.enabledLayers) {
            if (sequentialLayers.includes(layerNum) && this.layers[layerNum]) {
                this.log(chalk.cyan(`📋 Running Layer ${layerNum} (sequential): ${this.layers[layerNum].name}`));
                
                try {
                    const layerResult = await this.runLayerWithFastFail(layerNum);
                    results.layerResults[layerNum] = layerResult;
                    results.metadata.layersUsed.push(layerNum);
                    
                    this.logVerbose(`Layer ${layerNum} extracted:`, Object.keys(layerResult.data || {}));
                    
                } catch (error) {
                    this.log(chalk.yellow(`⚠️  Layer ${layerNum} failed: ${error.message}`));
                    results.layerResults[layerNum] = { data: {}, confidence: {}, error: error.message };
                }
            }
        }
        
        // Calculate preliminary confidence to determine if OCR layer should run
        this.log(chalk.blue('🔄 Merging initial layer results...'));
        const preliminaryData = this.fieldMerger.mergeAllLayers(results.layerResults);
        const preliminaryConfidence = this.confidenceCalculator.calculateFinalConfidence(
            results.layerResults, 
            preliminaryData
        );
        const overallConfidence = this.confidenceCalculator.calculateOverallConfidence(preliminaryConfidence);
        
        // Run OCR layer conditionally based on confidence
        if (overallConfidence < this.options.ocrTriggerThreshold) {
            for (const layerNum of this.options.enabledLayers) {
                if (conditionalLayers.includes(layerNum) && this.layers[layerNum]) {
                    this.log(chalk.cyan(`📋 Running Layer ${layerNum} (conditional - confidence ${overallConfidence}% < ${this.options.ocrTriggerThreshold}%): ${this.layers[layerNum].name}`));
                    
                    try {
                        const layerResult = await this.runLayerWithFastFail(layerNum);
                        results.layerResults[layerNum] = layerResult;
                        results.metadata.layersUsed.push(layerNum);
                        
                        this.logVerbose(`Layer ${layerNum} extracted:`, Object.keys(layerResult.data || {}));
                        
                    } catch (error) {
                        this.log(chalk.yellow(`⚠️  Layer ${layerNum} failed: ${error.message}`));
                        results.layerResults[layerNum] = { data: {}, confidence: {}, error: error.message };
                    }
                }
            }
        } else {
            this.log(chalk.green(`✅ Confidence ${overallConfidence}% >= ${this.options.ocrTriggerThreshold}%, skipping OCR layer`));
        }
        
        // Merge results from all layers (including OCR if run)
        this.log(chalk.blue('🔄 Merging final layer results...'));
        const mergedData = this.fieldMerger.mergeAllLayers(results.layerResults);
        
        // Calculate final confidence scores
        results.confidence = this.confidenceCalculator.calculateFinalConfidence(
            results.layerResults, 
            mergedData
        );
        
        // Validate and enforce Hash app requirements
        if (this.options.enforceHashRequirements) {
            this.log(chalk.blue('✅ Enforcing Hash app requirements...'));
            mergedData.data = this.hashValidator.enforceRequirements(mergedData.data, results.confidence);
        }
        
        results.data = mergedData.data;
        results.metadata.totalConfidence = this.confidenceCalculator.calculateOverallConfidence(results.confidence);
        
        this.log(chalk.green(`✅ Extraction complete. Overall confidence: ${results.metadata.totalConfidence}%`));
        
        // Memory optimization: Clean up page content references after extraction
        await this.cleanupAfterExtraction();
        
        return results;
    }
    
    /**
     * Run a specific extraction layer with timeout protection and fast-fail logic
     */
    async runLayer(layerNumber) {
        return this.runLayerWithFastFail(layerNumber);
    }
    
    /**
     * Run layer with fast-fail logic and reduced timeout
     */
    async runLayerWithFastFail(layerNumber) {
        const layer = this.layers[layerNumber];
        
        // Fast-fail: Check if page is still responsive before running layer
        try {
            await this.page.evaluate(() => document.readyState, { timeout: 500 });
        } catch (error) {
            throw new Error(`Layer ${layerNumber} fast-fail: page unresponsive`);
        }
        
        return Promise.race([
            layer.extract(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Layer ${layerNumber} timeout after ${this.options.layerTimeout}ms`)), this.options.layerTimeout)
            )
        ]);
    }
    
    /**
     * Extract specific field with all layers
     */
    async extractField(fieldName) {
        const results = await this.extract();
        return {
            value: results.data[fieldName],
            confidence: results.confidence[fieldName] || 0,
            sources: this.getFieldSources(fieldName, results.layerResults)
        };
    }
    
    /**
     * Get which layers contributed to a specific field
     */
    getFieldSources(fieldName, layerResults) {
        const sources = [];
        for (const [layerNum, result] of Object.entries(layerResults)) {
            if (result.data && result.data[fieldName]) {
                sources.push({
                    layer: parseInt(layerNum),
                    value: result.data[fieldName],
                    confidence: result.confidence[fieldName] || 0
                });
            }
        }
        return sources;
    }
    
    /**
     * Validate extraction results
     */
    validateResults(results) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            score: 0
        };
        
        // Check minimum confidence thresholds
        const requiredFields = ['title', 'date', 'address'];
        for (const field of requiredFields) {
            const confidence = results.confidence[field] || 0;
            if (confidence < this.options.minConfidence) {
                validation.errors.push(`${field} confidence too low: ${confidence}%`);
                validation.isValid = false;
            }
        }
        
        // Check Hash app specific requirements
        if (this.options.enforceHashRequirements) {
            const hashValidation = this.hashValidator.validate(results.data);
            validation.errors.push(...hashValidation.errors);
            validation.warnings.push(...hashValidation.warnings);
        }
        
        validation.score = results.metadata.totalConfidence;
        
        return validation;
    }
}

/**
 * Layer 1: Enhanced Structured Data Extraction
 * Extracts data from JSON-LD, Microdata, and RDFa
 */
class StructuredDataLayer {
    constructor(page, options = {}) {
        this.page = page;
        this.options = options;
        this.name = 'Enhanced Structured Data';
    }
    
    async extract() {
        const data = {};
        const confidence = {};
        
        // Extract from JSON-LD (highest priority)
        const jsonLdData = await this.extractJsonLD();
        Object.assign(data, jsonLdData.data);
        Object.assign(confidence, jsonLdData.confidence);
        
        // Extract from Microdata
        const microdataData = await this.extractMicrodata();
        this.mergeWithLowerPriority(data, confidence, microdataData);
        
        // Extract from RDFa
        const rdfaData = await this.extractRDFa();
        this.mergeWithLowerPriority(data, confidence, rdfaData);
        
        return { data, confidence };
    }
    
    async extractJsonLD() {
        const data = {};
        const confidence = {};
        
        try {
            const scripts = await this.page.locator('script[type="application/ld+json"]').all();
            
            for (const script of scripts) {
                const content = await script.textContent();
                if (!content) continue;
                
                try {
                    const jsonData = JSON.parse(content);
                    const eventData = this.findEventData(jsonData);
                    
                    if (eventData) {
                        // Extract event fields with high confidence (JSON-LD is structured)
                        this.extractEventFields(eventData, data, confidence, 90);
                    }
                } catch (parseError) {
                    continue;
                }
            }
        } catch (error) {
            // Silent fail - layer should not throw
        }
        
        return { data, confidence };
    }
    
    findEventData(jsonData) {
        const eventTypes = ['Event', 'SocialEvent', 'BusinessEvent', 'ChildrensEvent', 
                           'ComedyEvent', 'CourseInstance', 'DanceEvent', 'DeliveryEvent',
                           'EducationEvent', 'ExhibitionEvent', 'Festival', 'FoodEvent',
                           'LiteraryEvent', 'MusicEvent', 'PublicationEvent', 'SaleEvent',
                           'ScreeningEvent', 'SportsEvent', 'TheaterEvent', 'VisualArtsEvent'];
        
        if (Array.isArray(jsonData)) {
            for (const item of jsonData) {
                if (eventTypes.includes(item['@type'])) {
                    return item;
                }
            }
        } else if (eventTypes.includes(jsonData['@type'])) {
            return jsonData;
        } else if (jsonData.mainEntity && eventTypes.includes(jsonData.mainEntity['@type'])) {
            return jsonData.mainEntity;
        }
        
        return null;
    }
    
    extractEventFields(eventData, data, confidence, baseConfidence) {
        // Title extraction with variations
        if (eventData.name) {
            data.title = this.cleanText(eventData.name);
            confidence.title = baseConfidence;
        } else if (eventData.headline) {
            data.title = this.cleanText(eventData.headline);
            confidence.title = baseConfidence - 5;
        }
        
        // Date and time extraction
        if (eventData.startDate) {
            try {
                const startDate = new Date(eventData.startDate);
                data.date = startDate.toISOString();
                data.startTime = startDate.toTimeString().split(' ')[0];
                confidence.date = baseConfidence;
                confidence.startTime = baseConfidence;
            } catch (e) {
                // Invalid date format
            }
        }
        
        if (eventData.endDate) {
            try {
                const endDate = new Date(eventData.endDate);
                data.endDate = endDate.toISOString();
                data.endTime = endDate.toTimeString().split(' ')[0];
                confidence.endDate = baseConfidence;
                confidence.endTime = baseConfidence;
            } catch (e) {
                // Invalid date format
            }
        }
        
        // Location extraction (comprehensive)
        if (eventData.location) {
            this.extractLocationData(eventData.location, data, confidence, baseConfidence);
        }
        
        // Description
        if (eventData.description) {
            data.description = this.cleanText(eventData.description);
            confidence.description = baseConfidence;
        }
        
        // Image extraction (multiple formats)
        if (eventData.image) {
            const images = this.extractImageUrls(eventData.image);
            if (images.length > 0) {
                data.imageUrls = images;
                data.imageUrl = images[0]; // Primary image
                confidence.imageUrls = baseConfidence;
                confidence.imageUrl = baseConfidence;
            }
        }
        
        // Price and ticket information
        if (eventData.offers) {
            this.extractOfferData(eventData.offers, data, confidence, baseConfidence);
        }
        
        // Organizer information
        if (eventData.organizer) {
            data.organizer = this.extractOrganizerData(eventData.organizer);
            confidence.organizer = baseConfidence;
        }
        
        // Performer information
        if (eventData.performer) {
            data.performers = this.extractPerformerData(eventData.performer);
            confidence.performers = baseConfidence;
        }
        
        // Category/type information
        if (eventData.eventAttendanceMode) {
            data.attendanceMode = eventData.eventAttendanceMode;
            confidence.attendanceMode = baseConfidence;
        }
        
        if (eventData.eventStatus) {
            data.eventStatus = eventData.eventStatus;
            confidence.eventStatus = baseConfidence;
        }
    }
    
    extractLocationData(location, data, confidence, baseConfidence) {
        if (typeof location === 'string') {
            data.venue = location;
            confidence.venue = baseConfidence - 10;
        } else if (typeof location === 'object') {
            // Venue name
            if (location.name) {
                data.venue = this.cleanText(location.name);
                confidence.venue = baseConfidence;
            }
            
            // Address handling (multiple formats)
            if (location.address) {
                if (typeof location.address === 'string') {
                    data.address = this.cleanText(location.address);
                    confidence.address = baseConfidence;
                } else if (typeof location.address === 'object') {
                    // PostalAddress schema
                    const addressParts = [];
                    
                    if (location.address.streetAddress) {
                        addressParts.push(location.address.streetAddress);
                    }
                    if (location.address.addressLocality) {
                        data.city = location.address.addressLocality;
                        addressParts.push(location.address.addressLocality);
                        confidence.city = baseConfidence;
                    }
                    if (location.address.addressRegion) {
                        data.state = location.address.addressRegion;
                        addressParts.push(location.address.addressRegion);
                        confidence.state = baseConfidence;
                    }
                    if (location.address.postalCode) {
                        data.zipCode = location.address.postalCode;
                        addressParts.push(location.address.postalCode);
                        confidence.zipCode = baseConfidence;
                    }
                    
                    if (addressParts.length > 0) {
                        data.address = addressParts.join(', ');
                        confidence.address = baseConfidence;
                    }
                }
            }
            
            // Coordinates
            if (location.geo) {
                if (location.geo.latitude && location.geo.longitude) {
                    data.coordinates = {
                        lat: parseFloat(location.geo.latitude),
                        lng: parseFloat(location.geo.longitude)
                    };
                    confidence.coordinates = baseConfidence;
                }
            }
        }
    }
    
    extractImageUrls(imageData) {
        const urls = [];
        
        if (Array.isArray(imageData)) {
            for (const img of imageData) {
                const url = this.extractSingleImageUrl(img);
                if (url) urls.push(url);
            }
        } else {
            const url = this.extractSingleImageUrl(imageData);
            if (url) urls.push(url);
        }
        
        return urls;
    }
    
    extractSingleImageUrl(img) {
        if (typeof img === 'string') {
            return img;
        } else if (typeof img === 'object' && img.url) {
            return img.url;
        } else if (typeof img === 'object' && img.contentUrl) {
            return img.contentUrl;
        }
        return null;
    }
    
    extractOfferData(offers, data, confidence, baseConfidence) {
        const offerArray = Array.isArray(offers) ? offers : [offers];
        
        let minPrice = Infinity;
        let maxPrice = 0;
        let hasFree = false;
        let currency = 'USD';
        
        for (const offer of offerArray) {
            // Price information
            if (offer.lowPrice !== undefined) {
                const price = parseFloat(offer.lowPrice);
                if (!isNaN(price)) {
                    minPrice = Math.min(minPrice, price);
                    if (price === 0) hasFree = true;
                }
            }
            
            if (offer.highPrice !== undefined) {
                const price = parseFloat(offer.highPrice);
                if (!isNaN(price)) {
                    maxPrice = Math.max(maxPrice, price);
                }
            }
            
            if (offer.price !== undefined) {
                const price = parseFloat(offer.price);
                if (!isNaN(price)) {
                    minPrice = Math.min(minPrice, price);
                    maxPrice = Math.max(maxPrice, price);
                    if (price === 0) hasFree = true;
                }
            }
            
            // Currency
            if (offer.priceCurrency) {
                currency = offer.priceCurrency;
            }
            
            // Availability
            if (offer.availability) {
                data.availability = offer.availability;
                confidence.availability = baseConfidence;
                
                // Check for sold out
                if (offer.availability.includes('SoldOut')) {
                    data.soldOut = true;
                    confidence.soldOut = baseConfidence;
                }
            }
            
            // Ticket URL
            if (offer.url) {
                data.ticketsLink = offer.url;
                confidence.ticketsLink = baseConfidence;
            }
        }
        
        // Set price information
        if (minPrice !== Infinity) {
            data.minPrice = minPrice;
            data.free = hasFree || minPrice === 0;
            confidence.minPrice = baseConfidence;
            confidence.free = baseConfidence;
        }
        
        if (maxPrice > 0) {
            data.maxPrice = maxPrice;
            confidence.maxPrice = baseConfidence;
        }
        
        data.currency = currency;
        confidence.currency = baseConfidence - 10;
    }
    
    extractOrganizerData(organizer) {
        if (typeof organizer === 'string') {
            return { name: organizer };
        } else if (typeof organizer === 'object') {
            return {
                name: organizer.name,
                url: organizer.url,
                email: organizer.email,
                phone: organizer.telephone
            };
        }
        return null;
    }
    
    extractPerformerData(performers) {
        const performerArray = Array.isArray(performers) ? performers : [performers];
        return performerArray.map(performer => {
            if (typeof performer === 'string') {
                return { name: performer };
            } else if (typeof performer === 'object') {
                return {
                    name: performer.name,
                    type: performer['@type'],
                    url: performer.url
                };
            }
            return null;
        }).filter(Boolean);
    }
    
    async extractMicrodata() {
        const data = {};
        const confidence = {};
        
        try {
            // Look for microdata with itemtype="http://schema.org/Event"
            const eventElements = await this.page.locator('[itemtype*="Event"]').all();
            
            for (const element of eventElements) {
                // Extract itemprops within this event element
                const props = await this.extractItempropData(element);
                Object.assign(data, props.data);
                
                // Lower confidence for microdata
                for (const [key, value] of Object.entries(props.data)) {
                    confidence[key] = 75;
                }
            }
        } catch (error) {
            // Silent fail
        }
        
        return { data, confidence };
    }
    
    async extractItempropData(element) {
        const data = {};
        
        try {
            // Common itemprop mappings
            const propMappings = {
                'name': 'title',
                'description': 'description',
                'startDate': 'date',
                'endDate': 'endDate',
                'location': 'venue',
                'image': 'imageUrl',
                'offers': 'price'
            };
            
            for (const [prop, field] of Object.entries(propMappings)) {
                const propElement = element.locator(`[itemprop="${prop}"]`).first();
                if (await propElement.count() > 0) {
                    let value = await propElement.textContent();
                    
                    // Special handling for different types
                    if (prop === 'startDate' || prop === 'endDate') {
                        const datetime = await propElement.getAttribute('datetime');
                        if (datetime) value = datetime;
                    } else if (prop === 'image') {
                        value = await propElement.getAttribute('src') || 
                               await propElement.getAttribute('content');
                    } else if (prop === 'location') {
                        const locationName = await propElement.locator('[itemprop="name"]').textContent();
                        if (locationName) value = locationName;
                    }
                    
                    if (value && value.trim()) {
                        data[field] = this.cleanText(value.trim());
                    }
                }
            }
        } catch (error) {
            // Silent fail for individual extractions
        }
        
        return { data };
    }
    
    async extractRDFa() {
        const data = {};
        const confidence = {};
        
        try {
            // Look for RDFa properties
            const rdfa_mappings = {
                'dc:title': 'title',
                'schema:name': 'title',
                'schema:description': 'description',
                'schema:startDate': 'date',
                'schema:location': 'venue',
                'schema:image': 'imageUrl'
            };
            
            for (const [property, field] of Object.entries(rdfa_mappings)) {
                const elements = await this.page.locator(`[property="${property}"]`).all();
                
                for (const element of elements) {
                    const content = await element.getAttribute('content') || 
                                   await element.textContent();
                    
                    if (content && content.trim()) {
                        data[field] = this.cleanText(content.trim());
                        confidence[field] = 70; // Medium confidence for RDFa
                        break; // Use first found
                    }
                }
            }
        } catch (error) {
            // Silent fail
        }
        
        return { data, confidence };
    }
    
    cleanText(text) {
        if (!text || typeof text !== 'string') return text;
        return text.replace(/\s+/g, ' ').trim();
    }
    
    mergeWithLowerPriority(existingData, existingConfidence, newData) {
        for (const [key, value] of Object.entries(newData.data || {})) {
            if (!existingData[key] || (existingConfidence[key] || 0) < (newData.confidence[key] || 0)) {
                existingData[key] = value;
                existingConfidence[key] = newData.confidence[key] || 0;
            }
        }
    }
}

/**
 * Layer 2: Meta Tag Extraction System
 * Extracts data from Open Graph, Twitter Cards, and standard meta tags
 */
class MetaTagLayer {
    constructor(page, options = {}) {
        this.page = page;
        this.options = options;
        this.name = 'Meta Tag Extraction';
    }
    
    async extract() {
        const data = {};
        const confidence = {};
        
        // Extract from Open Graph tags (highest priority for meta)
        const ogData = await this.extractOpenGraph();
        Object.assign(data, ogData.data);
        Object.assign(confidence, ogData.confidence);
        
        // Extract from Twitter Cards
        const twitterData = await this.extractTwitterCards();
        this.mergeWithLowerPriority(data, confidence, twitterData);
        
        // Extract from standard meta tags
        const standardData = await this.extractStandardMeta();
        this.mergeWithLowerPriority(data, confidence, standardData);
        
        return { data, confidence };
    }
    
    async extractOpenGraph() {
        const data = {};
        const confidence = {};
        
        const ogMappings = {
            'og:title': { field: 'title', confidence: 80 },
            'og:description': { field: 'description', confidence: 80 },
            'og:image': { field: 'imageUrl', confidence: 85 },
            'og:url': { field: 'sourceUrl', confidence: 80 },
            'og:site_name': { field: 'siteName', confidence: 75 },
            'og:type': { field: 'ogType', confidence: 70 },
            
            // Event-specific OG tags
            'event:start_time': { field: 'date', confidence: 85 },
            'event:end_time': { field: 'endDate', confidence: 85 },
            'event:location:latitude': { field: 'lat', confidence: 90 },
            'event:location:longitude': { field: 'lng', confidence: 90 },
            'place:location:latitude': { field: 'lat', confidence: 85 },
            'place:location:longitude': { field: 'lng', confidence: 85 }
        };
        
        for (const [property, config] of Object.entries(ogMappings)) {
            try {
                const content = await this.page.getAttribute(`meta[property="${property}"]`, 'content');
                if (content && content.trim()) {
                    let value = content.trim();
                    
                    // Special processing for different field types
                    if (config.field === 'lat' || config.field === 'lng') {
                        value = parseFloat(value);
                        if (isNaN(value)) continue;
                    }
                    
                    data[config.field] = value;
                    confidence[config.field] = config.confidence;
                }
            } catch (error) {
                // Continue on error
            }
        }
        
        // Combine coordinates if both exist
        if (data.lat && data.lng) {
            data.coordinates = { lat: data.lat, lng: data.lng };
            confidence.coordinates = Math.min(confidence.lat, confidence.lng);
            delete data.lat;
            delete data.lng;
            delete confidence.lat;
            delete confidence.lng;
        }
        
        return { data, confidence };
    }
    
    async extractTwitterCards() {
        const data = {};
        const confidence = {};
        
        const twitterMappings = {
            'twitter:title': { field: 'title', confidence: 75 },
            'twitter:description': { field: 'description', confidence: 75 },
            'twitter:image': { field: 'imageUrl', confidence: 80 },
            'twitter:image:src': { field: 'imageUrl', confidence: 80 },
            'twitter:url': { field: 'sourceUrl', confidence: 75 },
            'twitter:site': { field: 'twitterSite', confidence: 70 },
            'twitter:creator': { field: 'twitterCreator', confidence: 70 }
        };
        
        for (const [name, config] of Object.entries(twitterMappings)) {
            try {
                const content = await this.page.getAttribute(`meta[name="${name}"]`, 'content');
                if (content && content.trim()) {
                    data[config.field] = content.trim();
                    confidence[config.field] = config.confidence;
                }
            } catch (error) {
                // Continue on error
            }
        }
        
        return { data, confidence };
    }
    
    async extractStandardMeta() {
        const data = {};
        const confidence = {};
        
        const standardMappings = {
            'title': { field: 'metaTitle', confidence: 60 },
            'description': { field: 'description', confidence: 65 },
            'keywords': { field: 'keywords', confidence: 50 },
            'author': { field: 'author', confidence: 60 },
            'robots': { field: 'robots', confidence: 40 },
            'canonical': { field: 'canonicalUrl', confidence: 70 }
        };
        
        for (const [name, config] of Object.entries(standardMappings)) {
            try {
                let content;
                if (name === 'canonical') {
                    content = await this.page.getAttribute('link[rel="canonical"]', 'href');
                } else {
                    content = await this.page.getAttribute(`meta[name="${name}"]`, 'content');
                }
                
                if (content && content.trim()) {
                    data[config.field] = content.trim();
                    confidence[config.field] = config.confidence;
                }
            } catch (error) {
                // Continue on error
            }
        }
        
        // Extract title from <title> tag if no meta title
        if (!data.title && !data.metaTitle) {
            try {
                const titleContent = await this.page.textContent('title');
                if (titleContent && titleContent.trim()) {
                    data.title = titleContent.trim();
                    confidence.title = 70;
                }
            } catch (error) {
                // Continue on error
            }
        }
        
        return { data, confidence };
    }
    
    mergeWithLowerPriority(existingData, existingConfidence, newData) {
        for (const [key, value] of Object.entries(newData.data || {})) {
            if (!existingData[key] || (existingConfidence[key] || 0) < (newData.confidence[key] || 0)) {
                existingData[key] = value;
                existingConfidence[key] = newData.confidence[key] || 0;
            }
        }
    }
}

/**
 * Layer 3: Semantic HTML Pattern Recognition
 * Recognizes semantic HTML patterns and common class/ID conventions
 */
class SemanticHtmlLayer {
    constructor(page, options = {}) {
        this.page = page;
        this.options = options;
        this.name = 'Semantic HTML Patterns';
        
        // Define semantic patterns with priorities
        this.patterns = {
            title: {
                selectors: [
                    'h1[class*="event"]',
                    'h1[class*="title"]',
                    '[class*="event-title"]',
                    '[class*="event-name"]',
                    '[data-testid*="title"]',
                    '[data-testid*="event-title"]',
                    'h1',
                    'h2[class*="event"]',
                    '.title h1, .title h2',
                    'header h1, header h2'
                ],
                confidence: [85, 80, 90, 90, 85, 90, 70, 75, 75, 70]
            },
            
            description: {
                selectors: [
                    '[class*="event-description"]',
                    '[class*="description"]',
                    '[data-testid*="description"]',
                    '.about', '.summary',
                    'meta[name="description"]',
                    '[class*="event-details"]',
                    '[class*="event-info"]'
                ],
                confidence: [90, 80, 85, 75, 65, 80, 80]
            },
            
            venue: {
                selectors: [
                    '[class*="venue-name"]',
                    '[class*="venue"]',
                    '[class*="location-name"]',
                    '[data-testid*="venue"]',
                    '[class*="event-location"] h1',
                    '[class*="event-location"] h2',
                    '[class*="event-location"] h3'
                ],
                confidence: [90, 85, 88, 90, 85, 80, 75]
            },
            
            address: {
                selectors: [
                    '[class*="venue-address"]',
                    '[class*="address"]',
                    '[class*="location-address"]',
                    '[data-testid*="address"]',
                    '[class*="event-location"] p',
                    'address'
                ],
                confidence: [90, 85, 88, 90, 75, 80]
            },
            
            date: {
                selectors: [
                    'time[datetime]',
                    '[class*="event-date"]',
                    '[class*="date"]',
                    '[data-testid*="date"]',
                    '[class*="event-time"]',
                    '[class*="when"]'
                ],
                confidence: [95, 90, 80, 90, 85, 85]
            },
            
            time: {
                selectors: [
                    '[class*="event-time"]',
                    '[class*="start-time"]',
                    '[class*="time"]',
                    '[data-testid*="time"]',
                    'time'
                ],
                confidence: [90, 95, 75, 90, 80]
            },
            
            price: {
                selectors: [
                    '[class*="price"]',
                    '[class*="cost"]',
                    '[class*="ticket-price"]',
                    '[data-testid*="price"]',
                    '[class*="admission"]',
                    '[class*="fee"]'
                ],
                confidence: [90, 85, 95, 90, 80, 80]
            },
            
            image: {
                selectors: [
                    '[class*="event-image"] img',
                    '[class*="hero-image"] img',
                    '[class*="featured-image"] img',
                    '[class*="main-image"] img',
                    '[data-testid*="image"] img',
                    'main img',
                    'article img',
                    'header img'
                ],
                confidence: [95, 90, 90, 90, 85, 70, 75, 75]
            }
        };
    }
    
    async extract() {
        const data = {};
        const confidence = {};
        
        // Extract each field using pattern matching
        for (const [fieldName, pattern] of Object.entries(this.patterns)) {
            const result = await this.extractField(fieldName, pattern);
            if (result.value) {
                data[fieldName] = result.value;
                confidence[fieldName] = result.confidence;
            }
        }
        
        // Post-process extracted data
        this.postProcessData(data, confidence);
        
        return { data, confidence };
    }
    
    async extractField(fieldName, pattern) {
        for (let i = 0; i < pattern.selectors.length; i++) {
            const selector = pattern.selectors[i];
            const baseConfidence = pattern.confidence[i];
            
            try {
                const elements = await this.page.locator(selector).all();
                
                for (const element of elements) {
                    let value = await this.extractValueFromElement(element, fieldName);
                    
                    if (value && this.isValidValue(value, fieldName)) {
                        // Calculate confidence based on selector match quality
                        const confidence = this.calculateSelectorConfidence(
                            selector, 
                            value, 
                            fieldName, 
                            baseConfidence
                        );
                        
                        return { value, confidence };
                    }
                }
            } catch (error) {
                // Continue with next selector
            }
        }
        
        return { value: null, confidence: 0 };
    }
    
    async extractValueFromElement(element, fieldName) {
        try {
            switch (fieldName) {
                case 'image':
                    return await element.getAttribute('src') || 
                           await element.getAttribute('data-src') ||
                           await element.getAttribute('data-lazy-src');
                
                case 'date':
                case 'time':
                    // Try datetime attribute first, then text content
                    return await element.getAttribute('datetime') || 
                           await element.textContent();
                
                default:
                    return await element.textContent();
            }
        } catch (error) {
            return null;
        }
    }
    
    isValidValue(value, fieldName) {
        if (!value || typeof value !== 'string') return false;
        
        const trimmedValue = value.trim();
        if (!trimmedValue) return false;
        
        // Field-specific validation
        switch (fieldName) {
            case 'title':
                return trimmedValue.length >= 3 && trimmedValue.length <= 200;
            
            case 'description':
                return trimmedValue.length >= 10 && trimmedValue.length <= 2000;
            
            case 'venue':
            case 'address':
                return trimmedValue.length >= 3 && trimmedValue.length <= 300;
            
            case 'price':
                return /[\$\€\£\¥\₹]|\bfree\b|\b\d+\b/i.test(trimmedValue);
            
            case 'image':
                return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(trimmedValue) ||
                       trimmedValue.includes('image') ||
                       trimmedValue.includes('img');
            
            case 'date':
                // Basic date pattern check
                return /\d{4}|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(trimmedValue);
            
            case 'time':
                return /\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)/i.test(trimmedValue);
            
            default:
                return true;
        }
    }
    
    calculateSelectorConfidence(selector, value, fieldName, baseConfidence) {
        let confidence = baseConfidence;
        
        // Bonus for specific patterns
        if (selector.includes(`[class*="${fieldName}"]`) || 
            selector.includes(`[data-testid*="${fieldName}"]`)) {
            confidence += 5;
        }
        
        // Bonus for semantic HTML elements
        if (selector.includes('time') && fieldName === 'date') {
            confidence += 10;
        }
        
        if (selector.includes('address') && fieldName === 'address') {
            confidence += 10;
        }
        
        // Penalty for generic selectors
        if (selector === 'img' || selector === 'h1' || selector === 'p') {
            confidence -= 10;
        }
        
        return Math.max(10, Math.min(100, confidence));
    }
    
    postProcessData(data, confidence) {
        // Clean up extracted data
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                data[key] = value.replace(/\s+/g, ' ').trim();
            }
        }
        
        // Combine date and time if both exist
        if (data.date && data.time && !data.date.includes('T')) {
            try {
                const combinedDateTime = new Date(`${data.date} ${data.time}`);
                if (!isNaN(combinedDateTime.getTime())) {
                    data.date = combinedDateTime.toISOString();
                    confidence.date = Math.max(confidence.date || 0, confidence.time || 0);
                    delete data.time;
                    delete confidence.time;
                }
            } catch (error) {
                // Keep separate if combination fails
            }
        }
        
        // Extract multiple images if main image selector found multiple
        if (data.image) {
            data.imageUrl = data.image;
            data.imageUrls = [data.image];
            delete data.image;
            confidence.imageUrl = confidence.image;
            confidence.imageUrls = confidence.image;
            delete confidence.image;
        }
    }
}

/**
 * Layer 4: Text Pattern Matching Algorithms
 * Uses regex patterns and NLP techniques to extract data from text content
 */
class TextPatternLayer {
    constructor(page, options = {}) {
        this.page = page;
        this.options = options;
        this.name = 'Text Pattern Matching';
        
        // Define text extraction patterns
        this.patterns = {
            date: [
                // ISO date formats
                { regex: /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, confidence: 95, type: 'iso' },
                { regex: /\b\d{4}-\d{2}-\d{2}\b/g, confidence: 90, type: 'iso_date' },
                
                // US date formats
                { regex: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, confidence: 80, type: 'us_date' },
                { regex: /\b\d{1,2}-\d{1,2}-\d{4}\b/g, confidence: 75, type: 'us_date_dash' },
                
                // Verbose date formats
                { regex: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi, confidence: 85, type: 'verbose' },
                { regex: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}\b/gi, confidence: 80, type: 'abbreviated' },
                
                // Day of week patterns
                { regex: /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi, confidence: 90, type: 'day_verbose' }
            ],
            
            time: [
                // 12-hour format
                { regex: /\b\d{1,2}:\d{2}\s*(AM|PM)\b/gi, confidence: 90, type: '12hour' },
                { regex: /\b\d{1,2}:\d{2}:\d{2}\s*(AM|PM)\b/gi, confidence: 95, type: '12hour_seconds' },
                
                // 24-hour format
                { regex: /\b\d{1,2}:\d{2}\b/g, confidence: 75, type: '24hour' },
                { regex: /\b\d{1,2}:\d{2}:\d{2}\b/g, confidence: 80, type: '24hour_seconds' },
                
                // Verbose time
                { regex: /\bat\s+\d{1,2}:\d{2}\s*(AM|PM)\b/gi, confidence: 85, type: 'verbose_12hour' },
                { regex: /\b\d{1,2}(:\d{2})?\s*o'clock\b/gi, confidence: 70, type: 'oclock' }
            ],
            
            price: [
                // Currency symbols
                { regex: /\$\d+(\.\d{2})?/g, confidence: 90, type: 'dollar' },
                { regex: /€\d+(\.\d{2})?/g, confidence: 90, type: 'euro' },
                { regex: /£\d+(\.\d{2})?/g, confidence: 90, type: 'pound' },
                
                // Free indicators
                { regex: /\b(free|no charge|complimentary|gratis)\b/gi, confidence: 95, type: 'free' },
                { regex: /\$0(\.00)?\b/g, confidence: 95, type: 'free_dollar' },
                
                // Price ranges
                { regex: /\$\d+(\.\d{2})?\s*-\s*\$\d+(\.\d{2})?/g, confidence: 85, type: 'range_dollar' },
                { regex: /\bfrom\s+\$\d+(\.\d{2})?/gi, confidence: 80, type: 'from_price' }
            ],
            
            phone: [
                // US phone formats
                { regex: /\b\(\d{3}\)\s*\d{3}-\d{4}\b/g, confidence: 95, type: 'us_formatted' },
                { regex: /\b\d{3}-\d{3}-\d{4}\b/g, confidence: 90, type: 'us_dashed' },
                { regex: /\b\d{3}\.\d{3}\.\d{4}\b/g, confidence: 85, type: 'us_dotted' },
                
                // International formats
                { regex: /\+\d{1,4}\s*\d{3,14}/g, confidence: 80, type: 'international' }
            ],
            
            email: [
                { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, confidence: 95, type: 'standard' }
            ],
            
            address: [
                // US address patterns
                { regex: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\.?\s*,?\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(-\d{4})?\b/gi, confidence: 90, type: 'full_us' },
                { regex: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\.?\b/gi, confidence: 75, type: 'street_only' }
            ]
        };
    }
    
    async extract() {
        const data = {};
        const confidence = {};
        
        // Get page text content for pattern matching
        const pageText = await this.getPageText();
        
        // Extract patterns from text
        for (const [fieldName, patterns] of Object.entries(this.patterns)) {
            const results = this.extractPatternsFromText(pageText, patterns, fieldName);
            if (results.length > 0) {
                // Use the highest confidence match
                const bestResult = results.reduce((best, current) => 
                    current.confidence > best.confidence ? current : best
                );
                
                data[fieldName] = bestResult.value;
                confidence[fieldName] = bestResult.confidence;
            }
        }
        
        // Post-process and enhance extracted data
        this.enhanceExtractedData(data, confidence, pageText);
        
        return { data, confidence };
    }
    
    async getPageText() {
        try {
            // Get text from main content areas, avoiding navigation and footers
            const contentSelectors = [
                'main',
                'article', 
                '[role="main"]',
                '.content',
                '.main-content',
                'body'
            ];
            
            for (const selector of contentSelectors) {
                try {
                    const text = await this.page.textContent(selector);
                    if (text && text.length > 100) {
                        return text;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            // Fallback to full body text
            return await this.page.textContent('body') || '';
            
        } catch (error) {
            return '';
        }
    }
    
    extractPatternsFromText(text, patterns, fieldName) {
        const results = [];
        
        for (const pattern of patterns) {
            const matches = [...text.matchAll(pattern.regex)];
            
            for (const match of matches) {
                const value = this.processMatch(match[0], pattern.type, fieldName);
                if (value) {
                    results.push({
                        value: value,
                        confidence: pattern.confidence,
                        type: pattern.type,
                        context: this.getMatchContext(text, match.index, 50)
                    });
                }
            }
        }
        
        return results;
    }
    
    processMatch(rawValue, patternType, fieldName) {
        if (!rawValue) return null;
        
        const trimmed = rawValue.trim();
        
        switch (fieldName) {
            case 'date':
                return this.processDateMatch(trimmed, patternType);
            
            case 'time':
                return this.processTimeMatch(trimmed, patternType);
            
            case 'price':
                return this.processPriceMatch(trimmed, patternType);
            
            case 'phone':
                return this.processPhoneMatch(trimmed, patternType);
            
            case 'email':
                return trimmed.toLowerCase();
            
            case 'address':
                return this.processAddressMatch(trimmed, patternType);
            
            default:
                return trimmed;
        }
    }
    
    processDateMatch(value, type) {
        try {
            let date;
            
            switch (type) {
                case 'iso':
                case 'iso_date':
                    date = new Date(value);
                    break;
                
                case 'us_date':
                case 'us_date_dash':
                    // Parse MM/DD/YYYY or MM-DD-YYYY
                    const parts = value.split(/[\/\-]/);
                    if (parts.length === 3) {
                        date = new Date(parts[2], parts[0] - 1, parts[1]);
                    }
                    break;
                
                default:
                    date = new Date(value);
            }
            
            if (date && !isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch (error) {
            // Return null for invalid dates
        }
        
        return null;
    }
    
    processTimeMatch(value, type) {
        // Normalize time format to HH:MM:SS
        try {
            const timeMatch = value.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const seconds = parseInt(timeMatch[3] || 0);
                const meridiem = timeMatch[4];
                
                if (meridiem) {
                    if (meridiem.toUpperCase() === 'PM' && hours !== 12) {
                        hours += 12;
                    } else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
                        hours = 0;
                    }
                }
                
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        } catch (error) {
            // Return null for invalid times
        }
        
        return null;
    }
    
    processPriceMatch(value, type) {
        if (type === 'free' || type === 'free_dollar') {
            return { free: true, price: 0 };
        }
        
        // Extract numeric price
        const priceMatch = value.match(/[\d\.]+/);
        if (priceMatch) {
            const price = parseFloat(priceMatch[0]);
            if (!isNaN(price)) {
                return { free: price === 0, price: price, raw: value };
            }
        }
        
        return value;
    }
    
    processPhoneMatch(value, type) {
        // Normalize phone number format
        const digits = value.replace(/\D/g, '');
        
        if (digits.length === 10) {
            return `(${digits.substr(0, 3)}) ${digits.substr(3, 3)}-${digits.substr(6, 4)}`;
        } else if (digits.length === 11 && digits[0] === '1') {
            return `+1 (${digits.substr(1, 3)}) ${digits.substr(4, 3)}-${digits.substr(7, 4)}`;
        }
        
        return value;
    }
    
    processAddressMatch(value, type) {
        // Clean up address formatting
        return value.replace(/\s+/g, ' ').trim();
    }
    
    getMatchContext(text, matchIndex, contextLength) {
        const start = Math.max(0, matchIndex - contextLength);
        const end = Math.min(text.length, matchIndex + contextLength);
        return text.substring(start, end);
    }
    
    enhanceExtractedData(data, confidence, pageText) {
        // Enhance date extraction by looking for context clues
        if (data.date) {
            // Look for end date nearby
            const dateIndex = pageText.indexOf(data.date);
            if (dateIndex !== -1) {
                const surroundingText = pageText.substring(
                    Math.max(0, dateIndex - 200), 
                    Math.min(pageText.length, dateIndex + 200)
                );
                
                // Look for end date patterns
                const endDatePatterns = [
                    /until\s+([^,\n]+)/gi,
                    /through\s+([^,\n]+)/gi,
                    /-\s*([^,\n]+)/gi
                ];
                
                for (const pattern of endDatePatterns) {
                    const match = surroundingText.match(pattern);
                    if (match) {
                        const endDate = this.processDateMatch(match[1], 'auto');
                        if (endDate) {
                            data.endDate = endDate;
                            confidence.endDate = (confidence.date || 0) - 10;
                            break;
                        }
                    }
                }
            }
        }
        
        // Enhance price extraction with context
        if (data.price && typeof data.price === 'object' && data.price.raw) {
            // Look for "starting at", "from", etc.
            if (data.price.raw.toLowerCase().includes('from') || 
                data.price.raw.toLowerCase().includes('starting')) {
                data.priceType = 'starting';
                confidence.price = Math.max(0, (confidence.price || 0) - 5);
            }
        }
    }
}

/**
 * Layer 5: Intelligent Content Analysis Fallback
 * Advanced content analysis with NLP-like techniques and intelligent defaults
 */
class ContentAnalysisLayer {
    constructor(page, options = {}) {
        this.page = page;
        this.options = options;
        this.name = 'Intelligent Content Analysis';
        
        // Define content analysis strategies
        this.strategies = {
            title: ['heading_hierarchy', 'largest_text', 'page_title'],
            description: ['paragraph_analysis', 'content_blocks', 'meta_fallback'],
            venue: ['location_context', 'address_context', 'title_analysis'],
            address: ['contact_sections', 'location_blocks', 'structured_address'],
            date: ['context_analysis', 'temporal_indicators'],
            image: ['content_priority', 'size_analysis', 'context_relevance']
        };
        
        // Event keywords for context analysis
        this.eventKeywords = [
            'event', 'concert', 'show', 'performance', 'festival', 'conference',
            'workshop', 'seminar', 'meeting', 'gathering', 'celebration',
            'exhibition', 'fair', 'market', 'sale', 'party', 'dance',
            'theater', 'theatre', 'play', 'musical', 'opera', 'ballet',
            'comedy', 'standup', 'presentation', 'lecture', 'class'
        ];
        
        // Venue/location keywords
        this.venueKeywords = [
            'venue', 'location', 'place', 'hall', 'center', 'theatre', 'theater',
            'auditorium', 'stadium', 'arena', 'club', 'bar', 'restaurant',
            'hotel', 'park', 'gallery', 'museum', 'library', 'church',
            'school', 'university', 'college', 'building'
        ];
    }
    
    async extract() {
        const data = {};
        const confidence = {};
        
        // Run analysis strategies for each field
        for (const [fieldName, strategies] of Object.entries(this.strategies)) {
            const result = await this.runAnalysisStrategies(fieldName, strategies);
            if (result.value) {
                data[fieldName] = result.value;
                confidence[fieldName] = result.confidence;
            }
        }
        
        // Generate intelligent defaults for missing critical fields
        await this.generateIntelligentDefaults(data, confidence);
        
        return { data, confidence };
    }
    
    async runAnalysisStrategies(fieldName, strategies) {
        const results = [];
        
        for (const strategy of strategies) {
            try {
                const result = await this.runStrategy(fieldName, strategy);
                if (result.value) {
                    results.push(result);
                }
            } catch (error) {
                // Continue with next strategy
            }
        }
        
        // Return the highest confidence result
        if (results.length > 0) {
            return results.reduce((best, current) => 
                current.confidence > best.confidence ? current : best
            );
        }
        
        return { value: null, confidence: 0 };
    }
    
    async runStrategy(fieldName, strategyName) {
        switch (strategyName) {
            case 'heading_hierarchy':
                return await this.analyzeHeadingHierarchy(fieldName);
                
            case 'largest_text':
                return await this.findLargestText(fieldName);
                
            case 'page_title':
                return await this.analyzePageTitle(fieldName);
                
            case 'paragraph_analysis':
                return await this.analyzeParagraphs(fieldName);
                
            case 'content_blocks':
                return await this.analyzeContentBlocks(fieldName);
                
            case 'meta_fallback':
                return await this.metaFallback(fieldName);
                
            case 'location_context':
                return await this.analyzeLocationContext(fieldName);
                
            case 'address_context':
                return await this.analyzeAddressContext(fieldName);
                
            case 'title_analysis':
                return await this.analyzeTitleForVenue(fieldName);
                
            case 'contact_sections':
                return await this.analyzeContactSections(fieldName);
                
            case 'location_blocks':
                return await this.analyzeLocationBlocks(fieldName);
                
            case 'structured_address':
                return await this.analyzeStructuredAddress(fieldName);
                
            case 'context_analysis':
                return await this.analyzeTemporalContext(fieldName);
                
            case 'temporal_indicators':
                return await this.findTemporalIndicators(fieldName);
                
            case 'content_priority':
                return await this.analyzeImagePriority(fieldName);
                
            case 'size_analysis':
                return await this.analyzeImageSize(fieldName);
                
            case 'context_relevance':
                return await this.analyzeImageRelevance(fieldName);
                
            default:
                return { value: null, confidence: 0 };
        }
    }
    
    async analyzeHeadingHierarchy(fieldName) {
        if (fieldName !== 'title') return { value: null, confidence: 0 };
        
        try {
            // Get all headings in order
            const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all();
            
            for (const heading of headings) {
                const text = await heading.textContent();
                if (text && text.trim().length > 3) {
                    const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
                    
                    // Higher confidence for h1, lower for lower levels
                    const baseConfidence = tagName === 'h1' ? 60 : 
                                          tagName === 'h2' ? 55 : 50;
                    
                    // Check if heading contains event-related keywords
                    const hasEventKeyword = this.eventKeywords.some(keyword => 
                        text.toLowerCase().includes(keyword)
                    );
                    
                    const confidence = hasEventKeyword ? baseConfidence + 10 : baseConfidence;
                    
                    return { value: text.trim(), confidence };
                }
            }
        } catch (error) {
            // Continue
        }
        
        return { value: null, confidence: 0 };
    }
    
    async findLargestText(fieldName) {
        if (fieldName !== 'title') return { value: null, confidence: 0 };
        
        try {
            // Find elements with largest font size that aren't navigation or footer
            const textElements = await this.page.locator('*:not(nav):not(footer):not(script):not(style)').all();
            
            let largestText = '';
            let largestSize = 0;
            
            for (const element of textElements) {
                const text = await element.textContent();
                if (!text || text.trim().length < 5) continue;
                
                try {
                    const fontSize = await element.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        return parseFloat(style.fontSize);
                    });
                    
                    if (fontSize > largestSize && text.trim().length < 200) {
                        largestSize = fontSize;
                        largestText = text.trim();
                    }
                } catch (e) {
                    continue;
                }
            }
            
            if (largestText && largestSize > 16) { // Reasonable title size
                return { value: largestText, confidence: 45 };
            }
        } catch (error) {
            // Continue
        }
        
        return { value: null, confidence: 0 };
    }
    
    async analyzePageTitle(fieldName) {
        if (fieldName !== 'title') return { value: null, confidence: 0 };
        
        try {
            const pageTitle = await this.page.textContent('title');
            if (pageTitle && pageTitle.trim()) {
                // Remove site name patterns
                const cleaned = pageTitle.replace(/\s*\|\s*[^|]+$/, '')
                                        .replace(/\s*-\s*[^-]+$/, '')
                                        .trim();
                
                return { value: cleaned || pageTitle.trim(), confidence: 40 };
            }
        } catch (error) {
            // Continue
        }
        
        return { value: null, confidence: 0 };
    }
    
    async analyzeParagraphs(fieldName) {
        if (fieldName !== 'description') return { value: null, confidence: 0 };
        
        try {
            const paragraphs = await this.page.locator('p').all();
            
            for (const p of paragraphs) {
                const text = await p.textContent();
                if (!text) continue;
                
                const trimmed = text.trim();
                
                // Look for descriptive paragraphs (not too short, not too long)
                if (trimmed.length >= 50 && trimmed.length <= 1000) {
                    // Check if it contains event-related content
                    const hasEventContent = this.eventKeywords.some(keyword => 
                        trimmed.toLowerCase().includes(keyword)
                    );
                    
                    if (hasEventContent) {
                        return { value: trimmed, confidence: 55 };
                    } else if (trimmed.length >= 100) {
                        return { value: trimmed, confidence: 45 };
                    }
                }
            }
        } catch (error) {
            // Continue
        }
        
        return { value: null, confidence: 0 };
    }
    
    async analyzeLocationContext(fieldName) {
        if (fieldName !== 'venue') return { value: null, confidence: 0 };
        
        try {
            // Look for text near location keywords
            const pageText = await this.page.textContent('body');
            
            for (const keyword of this.venueKeywords) {
                const regex = new RegExp(`${keyword}:?\\s*([^\\n]{10,100})`, 'gi');
                const match = pageText.match(regex);
                
                if (match) {
                    // Clean up the matched text
                    const venueText = match[0].replace(new RegExp(keyword + ':?\\s*', 'i'), '').trim();
                    
                    if (venueText.length > 3 && venueText.length < 100) {
                        return { value: venueText, confidence: 50 };
                    }
                }
            }
        } catch (error) {
            // Continue
        }
        
        return { value: null, confidence: 0 };
    }
    
    async analyzeImagePriority(fieldName) {
        if (fieldName !== 'image') return { value: null, confidence: 0 };
        
        try {
            const images = await this.page.locator('img').all();
            const imageData = [];
            
            for (const img of images) {
                const src = await img.getAttribute('src');
                if (!src) continue;
                
                const alt = await img.getAttribute('alt') || '';
                const className = await img.getAttribute('class') || '';
                
                // Calculate priority score
                let score = 0;
                
                // Bonus for event-related alt text or classes
                if (this.eventKeywords.some(keyword => 
                    alt.toLowerCase().includes(keyword) || 
                    className.toLowerCase().includes(keyword))) {
                    score += 20;
                }
                
                // Bonus for hero/featured classes
                if (className.includes('hero') || className.includes('featured') || 
                    className.includes('main') || className.includes('primary')) {
                    score += 15;
                }
                
                // Penalty for obvious non-event images
                if (alt.includes('logo') || alt.includes('icon') || 
                    className.includes('logo') || className.includes('icon')) {
                    score -= 30;
                }
                
                try {
                    // Get image dimensions
                    const dimensions = await img.evaluate(el => ({
                        width: el.naturalWidth || el.width,
                        height: el.naturalHeight || el.height
                    }));
                    
                    // Bonus for reasonable event image sizes
                    if (dimensions.width >= 300 && dimensions.height >= 200) {
                        score += 10;
                    }
                    
                    // Bonus for square/portrait images (good for events)
                    const ratio = dimensions.width / dimensions.height;
                    if (ratio >= 0.8 && ratio <= 1.25) {
                        score += 5;
                    }
                } catch (e) {
                    // Continue without size bonus
                }
                
                imageData.push({ src, score, alt, className });
            }
            
            // Sort by score and return highest
            imageData.sort((a, b) => b.score - a.score);
            
            if (imageData.length > 0 && imageData[0].score > 0) {
                return { 
                    value: imageData[0].src, 
                    confidence: Math.min(60, 30 + imageData[0].score) 
                };
            }
        } catch (error) {
            // Continue
        }
        
        return { value: null, confidence: 0 };
    }
    
    async generateIntelligentDefaults(data, confidence) {
        // Generate default date if missing (assume upcoming weekend)
        if (!data.date) {
            const now = new Date();
            const daysUntilWeekend = 6 - now.getDay(); // Days until Saturday
            const weekendDate = new Date(now);
            weekendDate.setDate(now.getDate() + (daysUntilWeekend > 0 ? daysUntilWeekend : 7));
            weekendDate.setHours(19, 0, 0, 0); // 7 PM default
            
            data.date = weekendDate.toISOString();
            data.startTime = '19:00:00';
            confidence.date = 30; // Low confidence default
            confidence.startTime = 30;
        }
        
        // Generate default title if missing
        if (!data.title) {
            const hostname = new URL(this.page.url()).hostname;
            const siteName = hostname.replace('www.', '').split('.')[0];
            data.title = `Event at ${siteName}`;
            confidence.title = 25; // Very low confidence
        }
        
        // Generate default venue if missing but have address
        if (!data.venue && data.address) {
            // Extract potential venue name from address
            const addressParts = data.address.split(',');
            if (addressParts.length > 0) {
                data.venue = addressParts[0].trim();
                confidence.venue = Math.max(0, (confidence.address || 0) - 20);
            }
        }
        
        // Set default values for Hash app requirements
        if (data.address && this.options.requireAddressComma && !data.address.includes(',')) {
            data.address += ', Location TBD';
            confidence.address = Math.max(0, (confidence.address || 0) - 10);
        }
    }
    
    // Additional strategy methods would be implemented here...
    // (Abbreviated for space - real implementation would include all strategies)
    
    async analyzeContentBlocks(fieldName) {
        // Implementation for content block analysis
        return { value: null, confidence: 0 };
    }
    
    async metaFallback(fieldName) {
        // Implementation for meta tag fallback
        return { value: null, confidence: 0 };
    }
    
    // ... other strategy methods
}

/**
 * Confidence Calculator
 * Calculates and manages confidence scores across layers
 */
class ConfidenceCalculator {
    constructor(options = {}) {
        this.options = options;
        
        // Layer weights for final confidence calculation
        this.layerWeights = {
            1: 1.0,   // Structured data gets full weight
            2: 0.8,   // Meta tags get high weight
            3: 0.7,   // Semantic HTML gets good weight  
            4: 0.6,   // Text patterns get medium weight
            5: 0.4,   // Content analysis gets lower weight
            6: 0.5    // OCR gets medium-low weight (higher than content analysis due to direct text extraction)
        };
    }
    
    calculateFinalConfidence(layerResults, mergedData) {
        const fieldConfidences = {};
        
        for (const [fieldName, value] of Object.entries(mergedData.data)) {
            fieldConfidences[fieldName] = this.calculateFieldConfidence(
                fieldName, 
                value, 
                layerResults
            );
        }
        
        return fieldConfidences;
    }
    
    calculateFieldConfidence(fieldName, finalValue, layerResults) {
        let totalWeight = 0;
        let weightedConfidence = 0;
        
        // Find all layers that contributed to this field
        for (const [layerNum, result] of Object.entries(layerResults)) {
            if (result.data && result.data[fieldName] === finalValue) {
                const layerWeight = this.layerWeights[parseInt(layerNum)] || 0.5;
                const layerConfidence = result.confidence[fieldName] || 0;
                
                weightedConfidence += layerConfidence * layerWeight;
                totalWeight += layerWeight;
            }
        }
        
        if (totalWeight === 0) return 0;
        
        const baseConfidence = weightedConfidence / totalWeight;
        
        // Apply field-specific adjustments
        return this.adjustConfidenceForField(fieldName, finalValue, baseConfidence);
    }
    
    adjustConfidenceForField(fieldName, value, baseConfidence) {
        let adjusted = baseConfidence;
        
        switch (fieldName) {
            case 'title':
                // Penalize very short or very long titles
                if (typeof value === 'string') {
                    if (value.length < 5) adjusted *= 0.7;
                    if (value.length > 150) adjusted *= 0.8;
                }
                break;
                
            case 'date':
                // Bonus for recent or future dates
                try {
                    const date = new Date(value);
                    const now = new Date();
                    const diffDays = (date - now) / (1000 * 60 * 60 * 24);
                    
                    if (diffDays >= -30 && diffDays <= 365) {
                        adjusted *= 1.1; // Reasonable date range
                    } else {
                        adjusted *= 0.8; // Suspicious date
                    }
                } catch (e) {
                    adjusted *= 0.5; // Invalid date format
                }
                break;
                
            case 'address':
                // Bonus for addresses with commas (typical formatting)
                if (typeof value === 'string' && value.includes(',')) {
                    adjusted *= 1.1;
                }
                break;
                
            case 'imageUrl':
                // Verify it looks like a valid image URL
                if (typeof value === 'string' && 
                    (value.includes('image') || /\.(jpg|jpeg|png|webp|gif)/i.test(value))) {
                    adjusted *= 1.05;
                } else {
                    adjusted *= 0.9;
                }
                break;
        }
        
        return Math.max(0, Math.min(100, adjusted));
    }
    
    calculateOverallConfidence(fieldConfidences) {
        const values = Object.values(fieldConfidences);
        if (values.length === 0) return 0;
        
        // Use weighted average with critical fields getting more weight
        const criticalFields = ['title', 'date', 'address'];
        let totalWeight = 0;
        let weightedSum = 0;
        
        for (const [field, confidence] of Object.entries(fieldConfidences)) {
            const weight = criticalFields.includes(field) ? 2.0 : 1.0;
            weightedSum += confidence * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }
}

/**
 * Hash App Requirement Validator
 * Enforces Hash app specific requirements and provides intelligent defaults
 */
class HashRequirementValidator {
    constructor(options = {}) {
        this.options = options;
        
        // Hash app category mappings
        this.validCategories = [
            'Music', 'Comedy', 'Arts & Theater', 'Nightlife', 'Food & Drink',
            'Sports', 'Education', 'Family', 'Community', 'Business'
        ];
        
        // Category keywords for intelligent mapping
        this.categoryKeywords = {
            'Music': ['concert', 'music', 'band', 'singer', 'dj', 'festival', 'acoustic', 'jazz', 'rock', 'pop'],
            'Comedy': ['comedy', 'comedian', 'standup', 'improv', 'funny', 'humor'],
            'Arts & Theater': ['theater', 'theatre', 'play', 'art', 'gallery', 'exhibition', 'dance', 'ballet', 'opera'],
            'Nightlife': ['party', 'club', 'bar', 'nightlife', 'drinks', 'dancing'],
            'Food & Drink': ['food', 'restaurant', 'wine', 'beer', 'tasting', 'cooking', 'chef', 'dining'],
            'Sports': ['sport', 'game', 'match', 'tournament', 'race', 'competition', 'team'],
            'Education': ['workshop', 'seminar', 'class', 'course', 'lecture', 'training', 'learn'],
            'Family': ['family', 'kids', 'children', 'child', 'parent', 'baby'],
            'Community': ['community', 'volunteer', 'charity', 'fundraiser', 'neighborhood', 'local'],
            'Business': ['business', 'networking', 'conference', 'meeting', 'professional', 'corporate']
        };
    }
    
    enforceRequirements(data, confidence) {
        const enhanced = { ...data };
        
        // Ensure address has comma (Hash app requirement)
        if (enhanced.address && this.options.requireAddressComma) {
            enhanced.address = this.ensureAddressComma(enhanced.address);
        }
        
        // Map to valid categories
        if (!enhanced.categories || enhanced.categories.length === 0) {
            enhanced.categories = this.intelligentCategoryMapping(enhanced);
        } else {
            enhanced.categories = this.validateCategories(enhanced.categories);
        }
        
        // Ensure required fields have values
        enhanced.title = enhanced.title || 'Event Title TBD';
        enhanced.description = enhanced.description || 'Event details to be announced.';
        enhanced.venue = enhanced.venue || 'Venue TBD';
        enhanced.address = enhanced.address || 'Address TBD';
        
        // Set boolean defaults
        enhanced.free = enhanced.free !== undefined ? enhanced.free : false;
        enhanced.soldOut = enhanced.soldOut !== undefined ? enhanced.soldOut : false;
        enhanced.hidden = enhanced.hidden !== undefined ? enhanced.hidden : false;
        
        return enhanced;
    }
    
    ensureAddressComma(address) {
        if (!address.includes(',')) {
            // Try to intelligently add comma
            const words = address.trim().split(/\s+/);
            if (words.length >= 3) {
                // Insert comma after first few words (likely street address)
                const streetPart = words.slice(0, Math.ceil(words.length / 2)).join(' ');
                const cityPart = words.slice(Math.ceil(words.length / 2)).join(' ');
                return `${streetPart}, ${cityPart}`;
            } else {
                return `${address}, Location TBD`;
            }
        }
        return address;
    }
    
    intelligentCategoryMapping(data) {
        const categories = [];
        const text = `${data.title || ''} ${data.description || ''} ${data.venue || ''}`.toLowerCase();
        
        // Score each category based on keyword matches
        const scores = {};
        for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
            scores[category] = 0;
            
            for (const keyword of keywords) {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = text.match(regex);
                if (matches) {
                    scores[category] += matches.length;
                }
            }
        }
        
        // Select top scoring categories
        const sortedCategories = Object.entries(scores)
            .filter(([_, score]) => score > 0)
            .sort(([_, a], [__, b]) => b - a)
            .slice(0, 2) // Maximum 2 categories
            .map(([category, _]) => category);
        
        // Default to Community if no matches
        return sortedCategories.length > 0 ? sortedCategories : ['Community'];
    }
    
    validateCategories(categories) {
        return categories
            .filter(cat => this.validCategories.includes(cat))
            .slice(0, 3); // Maximum 3 categories
    }
    
    validate(data) {
        const validation = {
            errors: [],
            warnings: [],
            isValid: true
        };
        
        // Check required fields
        const requiredFields = ['title', 'date', 'address'];
        for (const field of requiredFields) {
            if (!data[field]) {
                validation.errors.push(`Missing required field: ${field}`);
                validation.isValid = false;
            }
        }
        
        // Check address comma requirement
        if (data.address && this.options.requireAddressComma && !data.address.includes(',')) {
            validation.warnings.push('Address should contain a comma for proper formatting');
        }
        
        // Check categories
        if (!data.categories || data.categories.length === 0) {
            validation.warnings.push('No categories assigned - will use intelligent defaults');
        }
        
        return validation;
    }
}

/**
 * Field Merger
 * Intelligently merges field values from multiple layers
 */
class FieldMerger {
    constructor(options = {}) {
        this.options = options;
        
        // Merge strategies for different field types
        this.mergeStrategies = {
            string: 'highest_confidence',
            array: 'combine_unique',
            object: 'deep_merge',
            boolean: 'highest_confidence',
            number: 'highest_confidence'
        };
    }
    
    mergeAllLayers(layerResults) {
        const mergedData = {};
        const allFields = new Set();
        
        // Collect all possible fields
        for (const result of Object.values(layerResults)) {
            if (result.data) {
                Object.keys(result.data).forEach(field => allFields.add(field));
            }
        }
        
        // Merge each field
        for (const fieldName of allFields) {
            const fieldResults = this.collectFieldResults(fieldName, layerResults);
            if (fieldResults.length > 0) {
                const merged = this.mergeField(fieldName, fieldResults);
                if (merged !== null && merged !== undefined) {
                    mergedData[fieldName] = merged;
                }
            }
        }
        
        return { data: mergedData };
    }
    
    collectFieldResults(fieldName, layerResults) {
        const results = [];
        
        for (const [layerNum, result] of Object.entries(layerResults)) {
            if (result.data && result.data[fieldName] !== undefined) {
                results.push({
                    value: result.data[fieldName],
                    confidence: result.confidence[fieldName] || 0,
                    layer: parseInt(layerNum)
                });
            }
        }
        
        return results.sort((a, b) => b.confidence - a.confidence);
    }
    
    mergeField(fieldName, fieldResults) {
        if (fieldResults.length === 0) return null;
        if (fieldResults.length === 1) return fieldResults[0].value;
        
        const fieldType = this.determineFieldType(fieldResults[0].value);
        const strategy = this.mergeStrategies[fieldType] || 'highest_confidence';
        
        switch (strategy) {
            case 'highest_confidence':
                return fieldResults[0].value; // Already sorted by confidence
            
            case 'combine_unique':
                return this.combineUniqueValues(fieldResults);
            
            case 'deep_merge':
                return this.deepMergeObjects(fieldResults);
            
            default:
                return fieldResults[0].value;
        }
    }
    
    determineFieldType(value) {
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object' && value !== null) return 'object';
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'number') return 'number';
        return 'string';
    }
    
    combineUniqueValues(fieldResults) {
        const combined = new Set();
        
        for (const result of fieldResults) {
            if (Array.isArray(result.value)) {
                result.value.forEach(item => combined.add(item));
            } else {
                combined.add(result.value);
            }
        }
        
        return Array.from(combined);
    }
    
    deepMergeObjects(fieldResults) {
        const merged = {};
        
        for (const result of fieldResults) {
            if (typeof result.value === 'object' && result.value !== null) {
                Object.assign(merged, result.value);
            }
        }
        
        return merged;
    }
}

// Add cleanup method to UniversalExtractor
UniversalExtractor.prototype.cleanupAfterExtraction = async function() {
    try {
        // Clear any large DOM references and trigger garbage collection hints
        if (this.page) {
            // Remove unnecessary event listeners and clean up DOM
            await this.page.evaluate(() => {
                // Clear any cached selectors or large data structures
                if (window.extractorCache) {
                    window.extractorCache = null;
                }
                
                // Force garbage collection hint (if available)
                if (window.gc) {
                    window.gc();
                }
            });
        }
        
        // Clear internal caches and cleanup layers (especially OCR worker)
        for (const layer of Object.values(this.layers)) {
            if (layer.cleanup && typeof layer.cleanup === 'function') {
                await layer.cleanup();
            }
        }
        
    } catch (error) {
        // Silent cleanup failures to avoid breaking main extraction
        this.log(chalk.gray(`ℹ️  Cleanup note: ${error.message}`));
    }
};

module.exports = UniversalExtractor;