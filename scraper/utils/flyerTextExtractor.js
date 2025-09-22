#!/usr/bin/env node

/**
 * Flyer Text Extractor for Hash Event Scraper
 * 
 * A comprehensive OCR-based text extraction and parsing system specifically designed
 * for extracting event details from flyer images. Uses tesseract.js for OCR with
 * intelligent text pattern recognition, confidence scoring, and performance optimization.
 * 
 * Features:
 * - Advanced OCR text extraction with preprocessing
 * - Intelligent parsing for event details (title, date, time, venue, price)
 * - Pattern recognition for common flyer layouts
 * - Confidence scoring with quality assessment
 * - Performance optimization with caching and timeouts
 * - Multi-language support
 * - Error handling and retry mechanisms
 * 
 * @author Claude Code
 * @version 2.0.0
 */

const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const chalk = require('chalk');

/**
 * Flyer Text Extractor Class
 * Handles OCR extraction and intelligent parsing of event flyer images
 */
class FlyerTextExtractor {
    constructor(options = {}) {
        this.options = {
            // OCR Configuration
            tesseractWorkerOptions: {
                langPath: options.langPath || 'https://tessdata.projectnaptha.com/4.0.0',
                languages: options.languages || 'eng',
                corePath: options.corePath || 'https://unpkg.com/tesseract.js-core@v4.0.2'
            },
            
            // Performance settings
            timeout: options.timeout || 30000, // 30 seconds default
            maxRetries: options.maxRetries || 2,
            enableCache: options.enableCache !== false,
            cacheTimeout: options.cacheTimeout || 3600000, // 1 hour
            
            // Image processing
            imagePreprocessing: options.imagePreprocessing !== false,
            maxImageSize: options.maxImageSize || 2048, // Max dimension
            minImageSize: options.minImageSize || 400, // Min dimension
            contrastEnhancement: options.contrastEnhancement !== false,
            
            // Text extraction confidence
            minConfidence: options.minConfidence || 60,
            minTextLength: options.minTextLength || 10,
            
            // Pattern recognition
            enablePatternRecognition: options.enablePatternRecognition !== false,
            strictDateParsing: options.strictDateParsing !== false,
            enablePriceDetection: options.enablePriceDetection !== false,
            
            // Debug settings
            debug: options.debug || false,
            verbose: options.verbose || false,
            saveProcessedImages: options.saveProcessedImages || false,
            
            ...options
        };
        
        // Initialize caches
        this.ocrCache = new Map();
        this.imageCache = new Map();
        this.workerPool = [];
        this.activeWorkers = 0;
        this.maxWorkers = options.maxWorkers || 2;
        
        // Pattern definitions for text recognition
        this.patterns = {
            // Date patterns (comprehensive)
            dates: [
                // ISO and formal dates
                { regex: /\b\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?\b/g, confidence: 95, type: 'iso' },
                { regex: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, confidence: 90, type: 'us_date' },
                { regex: /\b\d{1,2}-\d{1,2}-\d{4}\b/g, confidence: 85, type: 'us_date_dash' },
                
                // Verbose date formats
                { regex: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi, confidence: 92, type: 'verbose_full' },
                { regex: /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi, confidence: 88, type: 'verbose_short' },
                
                // Day + Date combinations
                { regex: /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi, confidence: 95, type: 'day_verbose' },
                { regex: /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}\b/gi, confidence: 85, type: 'day_short' },
                
                // Relative dates
                { regex: /\b(?:today|tomorrow|this\s+(?:friday|saturday|sunday|monday|tuesday|wednesday|thursday))\b/gi, confidence: 75, type: 'relative' }
            ],
            
            // Time patterns
            times: [
                // Standard time formats
                { regex: /\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/gi, confidence: 95, type: '12hour' },
                { regex: /\b\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)\b/gi, confidence: 98, type: '12hour_seconds' },
                { regex: /\b\d{1,2}:\d{2}\b/g, confidence: 80, type: '24hour' },
                
                // Doors/Show time patterns
                { regex: /\b(?:doors?|show)\s*(?:open|start|begin)?(?:\s*@|\s*at)?\s*\d{1,2}:\d{2}\s*(?:AM|PM)?\b/gi, confidence: 90, type: 'event_time' },
                { regex: /\b(?:doors?)\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[|\/\-]\s*(?:show)\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\b/gi, confidence: 95, type: 'doors_show' },
                
                // Time ranges
                { regex: /\b\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[-–—]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?\b/gi, confidence: 88, type: 'time_range' }
            ],
            
            // Price patterns
            prices: [
                // Currency with amounts
                { regex: /\$\d{1,4}(?:\.\d{2})?\b/g, confidence: 95, type: 'dollar' },
                { regex: /\$\d{1,4}(?:\.\d{2})?\s*[-–—]\s*\$\d{1,4}(?:\.\d{2})?\b/g, confidence: 90, type: 'dollar_range' },
                
                // Free indicators
                { regex: /\b(?:free|no\s+charge|complimentary|gratis)\b/gi, confidence: 98, type: 'free' },
                { regex: /\$0(?:\.00)?\b/g, confidence: 95, type: 'free_price' },
                
                // Ticket terminology
                { regex: /\b(?:tickets?|admission|cover)\s*[:]\s*\$?\d{1,4}(?:\.\d{2})?\b/gi, confidence: 92, type: 'ticket_price' },
                { regex: /\b(?:advance|presale)\s*[:]\s*\$?\d{1,4}(?:\.\d{2})?\b/gi, confidence: 88, type: 'advance_price' },
                { regex: /\b(?:at\s+door|door)\s*[:]\s*\$?\d{1,4}(?:\.\d{2})?\b/gi, confidence: 88, type: 'door_price' }
            ],
            
            // Venue/Location patterns
            venues: [
                // Common venue indicators
                { regex: /\b(?:at|@)\s+([A-Za-z\s&'.-]{3,50})\b/g, confidence: 85, type: 'at_venue' },
                { regex: /\b(?:venue|location):\s*([A-Za-z\s&'.-]{3,50})/gi, confidence: 90, type: 'venue_label' },
                
                // Address patterns
                { regex: /\b\d+\s+[A-Za-z\s]{3,30}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Pl|Place)\.?\b/gi, confidence: 85, type: 'street_address' },
                
                // Common venue types
                { regex: /\b([A-Za-z\s&'.-]+(?:Theater|Theatre|Hall|Center|Club|Bar|Arena|Stadium|Park|Gallery|Museum))\b/gi, confidence: 88, type: 'venue_type' }
            ],
            
            // Title/Event name patterns
            titles: [
                // All caps titles (common in flyers)
                { regex: /\b[A-Z][A-Z\s&'.-]{10,80}\b/g, confidence: 80, type: 'all_caps' },
                
                // Quoted titles
                { regex: /"([^"]{5,60})"/g, confidence: 85, type: 'quoted' },
                
                // Event keywords
                { regex: /\b([A-Za-z\s&'.-]+(?:concert|show|festival|event|party|celebration|tour|live))\b/gi, confidence: 75, type: 'event_keyword' }
            ]
        };
        
        // Common event keywords for context analysis
        this.eventKeywords = [
            'concert', 'show', 'live', 'performance', 'festival', 'tour', 'event',
            'party', 'celebration', 'night', 'presents', 'featuring', 'with',
            'doors', 'tickets', 'advance', 'admission', 'cover', 'ages', 'all ages',
            '18+', '21+', 'sold out', 'limited', 'vip', 'general admission'
        ];
        
        // Noise words to filter from titles
        this.noiseWords = [
            'presents', 'proudly presents', 'tickets available', 'tickets on sale',
            'get tickets', 'buy tickets', 'more info', 'information', 'details',
            'visit', 'website', 'call', 'phone', 'email', 'follow us',
            'like us', 'facebook', 'twitter', 'instagram', 'www', 'http'
        ];
        
        this.log = this.options.debug ? console.log : () => {};
        this.logVerbose = this.options.verbose ? console.log : () => {};
    }
    
    /**
     * Main extraction method - processes image and extracts event details
     * @param {string|Buffer} imageInput - Image URL, path, or Buffer
     * @param {Object} context - Additional context (existing event data, etc.)
     * @returns {Promise<Object>} Extracted event data with confidence scores
     */
    async extractFromImage(imageInput, context = {}) {
        this.log(chalk.blue('🖼️  Starting flyer text extraction...'));
        
        const results = {
            success: false,
            data: {},
            confidence: {},
            metadata: {
                ocrConfidence: 0,
                processingTime: 0,
                imageSize: { width: 0, height: 0 },
                textLength: 0,
                extractedAt: new Date().toISOString(),
                source: 'flyerTextExtractor'
            },
            rawText: '',
            debug: {}
        };
        
        const startTime = Date.now();
        
        try {
            // Step 1: Process and prepare image
            const processedImage = await this.processImage(imageInput);
            results.metadata.imageSize = processedImage.metadata;
            
            // Step 2: Perform OCR extraction
            const ocrResult = await this.performOCR(processedImage.buffer);
            results.rawText = ocrResult.text;
            results.metadata.ocrConfidence = ocrResult.confidence;
            results.metadata.textLength = ocrResult.text.length;
            
            if (this.options.debug) {
                results.debug.ocrData = ocrResult;
            }
            
            // Step 3: Parse extracted text for event details
            if (ocrResult.text && ocrResult.text.length >= this.options.minTextLength) {
                const parsedData = await this.parseEventDetails(ocrResult.text, context);
                results.data = parsedData.data;
                results.confidence = parsedData.confidence;
                results.success = parsedData.success;
                
                if (this.options.debug) {
                    results.debug.parsedData = parsedData;
                }
            } else {
                this.log(chalk.yellow('⚠️  Insufficient text extracted from image'));
            }
            
            results.metadata.processingTime = Date.now() - startTime;
            
            this.log(chalk.green(`✅ Flyer extraction complete (${results.metadata.processingTime}ms)`));
            
            return results;
            
        } catch (error) {
            results.metadata.processingTime = Date.now() - startTime;
            results.error = error.message;
            
            this.log(chalk.red(`❌ Flyer extraction failed: ${error.message}`));
            
            return results;
        }
    }
    
    /**
     * Process and prepare image for OCR
     * @param {string|Buffer} imageInput - Image input
     * @returns {Promise<Object>} Processed image data
     */
    async processImage(imageInput) {
        this.log(chalk.cyan('📸 Processing image for OCR...'));
        
        let buffer;
        let cacheKey = null;
        
        // Handle different input types
        if (typeof imageInput === 'string') {
            cacheKey = `image_${Buffer.from(imageInput).toString('base64').slice(0, 32)}`;
            
            // Check cache first
            if (this.options.enableCache && this.imageCache.has(cacheKey)) {
                const cached = this.imageCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.options.cacheTimeout) {
                    this.log(chalk.gray('📁 Using cached processed image'));
                    return cached.data;
                }
            }
            
            // Fetch image if URL
            if (imageInput.startsWith('http')) {
                const response = await fetch(imageInput, { timeout: 10000 });
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.statusText}`);
                }
                buffer = Buffer.from(await response.arrayBuffer());
            } else {
                // Local file path
                buffer = require('fs').readFileSync(imageInput);
            }
        } else if (Buffer.isBuffer(imageInput)) {
            buffer = imageInput;
            cacheKey = `buffer_${buffer.toString('base64').slice(0, 32)}`;
        } else {
            throw new Error('Invalid image input type. Expected URL, path, or Buffer.');
        }
        
        // Get original image metadata
        const originalMetadata = await sharp(buffer).metadata();
        
        // Apply preprocessing if enabled
        if (this.options.imagePreprocessing) {
            buffer = await this.preprocessImageForOCR(buffer, originalMetadata);
        }
        
        const finalMetadata = await sharp(buffer).metadata();
        
        const result = {
            buffer,
            metadata: {
                original: {
                    width: originalMetadata.width,
                    height: originalMetadata.height,
                    format: originalMetadata.format
                },
                processed: {
                    width: finalMetadata.width,
                    height: finalMetadata.height,
                    format: finalMetadata.format
                }
            }
        };
        
        // Cache processed image
        if (this.options.enableCache && cacheKey) {
            this.imageCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
        }
        
        this.logVerbose(`   Processed: ${finalMetadata.width}x${finalMetadata.height}`);
        
        return result;
    }
    
    /**
     * Preprocess image to improve OCR accuracy
     * @param {Buffer} buffer - Image buffer
     * @param {Object} metadata - Image metadata
     * @returns {Promise<Buffer>} Preprocessed image buffer
     */
    async preprocessImageForOCR(buffer, metadata) {
        this.log(chalk.cyan('🔧 Preprocessing image for better OCR...'));
        
        let image = sharp(buffer);
        
        // Resize if too large or too small
        const { width, height } = metadata;
        const maxDim = Math.max(width, height);
        const minDim = Math.min(width, height);
        
        if (maxDim > this.options.maxImageSize || minDim < this.options.minImageSize) {
            const scale = maxDim > this.options.maxImageSize 
                ? this.options.maxImageSize / maxDim
                : this.options.minImageSize / minDim;
            
            image = image.resize(
                Math.round(width * scale),
                Math.round(height * scale),
                { kernel: sharp.kernel.lanczos3, withoutEnlargement: false }
            );
            
            this.logVerbose(`   Resizing by ${scale.toFixed(2)}x`);
        }
        
        // Convert to grayscale and enhance contrast
        image = image
            .grayscale()
            .normalize(); // Auto-adjust brightness/contrast
        
        // Apply sharpening for text clarity
        if (this.options.contrastEnhancement) {
            image = image
                .sharpen({ sigma: 1.0, m1: 1.0, m2: 0.2, x1: 2, y2: 10 })
                .modulate({
                    brightness: 1.1,  // Slight brightness boost
                    contrast: 1.2,    // Increase contrast
                    saturation: 0     // Already grayscale, but ensure
                });
            
            this.logVerbose('   Enhanced contrast and sharpness');
        }
        
        // Output as PNG for best quality
        const processedBuffer = await image.png().toBuffer();
        
        if (this.options.saveProcessedImages) {
            const filename = `processed_${Date.now()}.png`;
            require('fs').writeFileSync(filename, processedBuffer);
            this.log(chalk.gray(`   Saved processed image: ${filename}`));
        }
        
        return processedBuffer;
    }
    
    /**
     * Perform OCR on processed image
     * @param {Buffer} imageBuffer - Processed image buffer
     * @returns {Promise<Object>} OCR results with confidence
     */
    async performOCR(imageBuffer) {
        const cacheKey = `ocr_${imageBuffer.toString('base64').slice(0, 32)}`;
        
        // Check cache first
        if (this.options.enableCache && this.ocrCache.has(cacheKey)) {
            const cached = this.ocrCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.options.cacheTimeout) {
                this.log(chalk.gray('📁 Using cached OCR result'));
                return cached.data;
            }
        }
        
        this.log(chalk.cyan('🔍 Performing OCR extraction...'));
        
        let worker;
        let attempts = 0;
        const maxAttempts = this.options.maxRetries + 1;
        
        while (attempts < maxAttempts) {
            try {
                // Get or create worker
                worker = await this.getWorker();
                
                // Perform OCR with timeout
                const ocrPromise = worker.recognize(imageBuffer);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('OCR timeout')), this.options.timeout)
                );
                
                const result = await Promise.race([ocrPromise, timeoutPromise]);
                
                // Process OCR result
                const processedResult = this.processOCRResult(result);
                
                // Cache result
                if (this.options.enableCache) {
                    this.ocrCache.set(cacheKey, {
                        data: processedResult,
                        timestamp: Date.now()
                    });
                }
                
                this.logVerbose(`   OCR confidence: ${processedResult.confidence}%`);
                this.logVerbose(`   Extracted ${processedResult.text.length} characters`);
                
                return processedResult;
                
            } catch (error) {
                attempts++;
                this.log(chalk.yellow(`⚠️  OCR attempt ${attempts} failed: ${error.message}`));
                
                if (worker) {
                    await this.returnWorker(worker);
                    worker = null;
                }
                
                if (attempts >= maxAttempts) {
                    throw new Error(`OCR failed after ${maxAttempts} attempts: ${error.message}`);
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }
    }
    
    /**
     * Process raw OCR result and clean up text
     * @param {Object} ocrResult - Raw Tesseract result
     * @returns {Object} Processed OCR data
     */
    processOCRResult(ocrResult) {
        const rawText = ocrResult.data.text || '';
        const confidence = ocrResult.data.confidence || 0;
        
        // Clean up text
        const cleanText = rawText
            .replace(/\n{3,}/g, '\n\n')  // Reduce excessive line breaks
            .replace(/\s{3,}/g, '  ')    // Reduce excessive spaces
            .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable chars
            .trim();
        
        // Extract word-level confidence if available
        const wordConfidences = [];
        if (ocrResult.data.words) {
            for (const word of ocrResult.data.words) {
                if (word.confidence > 0) {
                    wordConfidences.push(word.confidence);
                }
            }
        }
        
        const avgWordConfidence = wordConfidences.length > 0 
            ? wordConfidences.reduce((sum, conf) => sum + conf, 0) / wordConfidences.length
            : confidence;
        
        return {
            text: cleanText,
            confidence: Math.round(avgWordConfidence),
            wordCount: cleanText.split(/\s+/).length,
            lines: cleanText.split('\n').length,
            metadata: {
                rawLength: rawText.length,
                cleanLength: cleanText.length,
                wordConfidences: this.options.debug ? wordConfidences : undefined
            }
        };
    }
    
    /**
     * Parse extracted text for event details using pattern recognition
     * @param {string} text - Extracted text from OCR
     * @param {Object} context - Additional context
     * @returns {Promise<Object>} Parsed event data
     */
    async parseEventDetails(text, context = {}) {
        this.log(chalk.blue('🔍 Parsing event details from extracted text...'));
        
        const results = {
            success: false,
            data: {},
            confidence: {},
            debug: {
                matches: {},
                patterns: {},
                contextAnalysis: {}
            }
        };
        
        // Pre-process text for better pattern matching
        const processedText = this.preprocessTextForParsing(text);
        
        // Extract different field types
        const extractors = {
            title: () => this.extractTitle(processedText, context),
            date: () => this.extractDate(processedText, context),
            time: () => this.extractTime(processedText, context),
            venue: () => this.extractVenue(processedText, context),
            address: () => this.extractAddress(processedText, context),
            price: () => this.extractPrice(processedText, context),
            description: () => this.extractDescription(processedText, context)
        };
        
        // Run all extractors
        for (const [fieldName, extractor] of Object.entries(extractors)) {
            try {
                const fieldResult = await extractor();
                if (fieldResult.value) {
                    results.data[fieldName] = fieldResult.value;
                    results.confidence[fieldName] = fieldResult.confidence;
                    
                    if (this.options.debug) {
                        results.debug.matches[fieldName] = fieldResult.debug;
                    }
                }
            } catch (error) {
                this.log(chalk.yellow(`⚠️  Error extracting ${fieldName}: ${error.message}`));
            }
        }
        
        // Post-process and validate results
        this.postProcessResults(results, processedText, context);
        
        // Calculate success based on critical fields
        const criticalFields = ['title', 'date'];
        const foundCritical = criticalFields.filter(field => results.data[field]).length;
        results.success = foundCritical >= 1 && Object.keys(results.data).length >= 2;
        
        this.log(chalk.green(`✅ Parsed ${Object.keys(results.data).length} event fields`));
        
        return results;
    }
    
    /**
     * Preprocess text for better pattern matching
     * @param {string} text - Raw OCR text
     * @returns {string} Processed text
     */
    preprocessTextForParsing(text) {
        return text
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            // Fix common OCR errors
            .replace(/[Il1|]/g, match => {
                // Context-based correction
                if (/\d/.test(text.charAt(text.indexOf(match) - 1)) || 
                    /\d/.test(text.charAt(text.indexOf(match) + 1))) {
                    return '1';
                }
                return match;
            })
            // Normalize currency symbols
            .replace(/[S$5]/g, '$')
            // Fix date separators
            .replace(/[\/\\]/g, '/')
            // Remove extra punctuation that might confuse patterns
            .replace(/[^\w\s$\/:\-,.'@#]/g, ' ')
            .trim();
    }
    
    /**
     * Extract event title from text
     * @param {string} text - Processed text
     * @param {Object} context - Context data
     * @returns {Object} Extraction result
     */
    extractTitle(text, context) {
        const candidates = [];
        
        // Try different title extraction strategies
        for (const pattern of this.patterns.titles) {
            const matches = [...text.matchAll(pattern.regex)];
            
            for (const match of matches) {
                let title = pattern.type === 'quoted' ? match[1] : match[0];
                title = this.cleanTitle(title);
                
                if (this.isValidTitle(title)) {
                    candidates.push({
                        value: title,
                        confidence: this.calculateTitleConfidence(title, text, pattern.confidence),
                        source: pattern.type,
                        position: match.index
                    });
                }
            }
        }
        
        // Also look for lines that might be titles (first few lines, largest text, etc.)
        const lines = text.split('\n').slice(0, 5); // Check first 5 lines
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (this.isValidTitle(line)) {
                const positionBonus = (5 - i) * 5; // Earlier lines get bonus
                candidates.push({
                    value: this.cleanTitle(line),
                    confidence: 70 + positionBonus,
                    source: 'line_position',
                    position: i
                });
            }
        }
        
        if (candidates.length === 0) {
            return { value: null, confidence: 0 };
        }
        
        // Sort by confidence and return best
        candidates.sort((a, b) => b.confidence - a.confidence);
        const best = candidates[0];
        
        return {
            value: best.value,
            confidence: Math.min(100, best.confidence),
            debug: this.options.debug ? { candidates, selected: best } : undefined
        };
    }
    
    /**
     * Clean and normalize title text
     * @param {string} title - Raw title
     * @returns {string} Cleaned title
     */
    cleanTitle(title) {
        return title
            .replace(/\s+/g, ' ')
            .replace(/^[^\w]+|[^\w]+$/g, '') // Remove leading/trailing non-word chars
            .replace(/\b(presents?|proudly\s+presents?)\b/gi, '')
            .trim();
    }
    
    /**
     * Validate if text could be a title
     * @param {string} text - Text to validate
     * @returns {boolean} Is valid title
     */
    isValidTitle(text) {
        if (!text || text.length < 3 || text.length > 120) return false;
        
        // Filter out noise
        const lower = text.toLowerCase();
        for (const noise of this.noiseWords) {
            if (lower.includes(noise)) return false;
        }
        
        // Must have some letters
        if (!/[a-zA-Z]{3,}/.test(text)) return false;
        
        // Shouldn't be mostly numbers or symbols
        const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
        return letterCount / text.length > 0.4;
    }
    
    /**
     * Calculate title confidence score
     * @param {string} title - Title text
     * @param {string} fullText - Full extracted text
     * @param {number} baseConfidence - Base pattern confidence
     * @returns {number} Confidence score
     */
    calculateTitleConfidence(title, fullText, baseConfidence) {
        let confidence = baseConfidence;
        
        // Bonus for title-like characteristics
        if (/^[A-Z]/.test(title)) confidence += 5; // Starts with capital
        if (title.length >= 10 && title.length <= 60) confidence += 10; // Good length
        if (/[&]|feat\.|featuring|with|presents/.test(title)) confidence += 5; // Event words
        
        // Context bonus - title appears early in text
        const position = fullText.indexOf(title);
        if (position < fullText.length * 0.2) confidence += 10; // First 20% of text
        
        // Penalty for suspicious patterns
        if (/\d{4}/.test(title)) confidence -= 5; // Contains year (might be date)
        if (/\$\d/.test(title)) confidence -= 10; // Contains price
        if (title.split(' ').length > 12) confidence -= 10; // Too many words
        
        return Math.max(0, confidence);
    }
    
    /**
     * Extract date from text using comprehensive patterns
     * @param {string} text - Processed text
     * @param {Object} context - Context data
     * @returns {Object} Extraction result
     */
    extractDate(text, context) {
        const candidates = [];
        
        for (const pattern of this.patterns.dates) {
            const matches = [...text.matchAll(pattern.regex)];
            
            for (const match of matches) {
                const dateStr = match[0];
                const parsedDate = this.parseDate(dateStr, pattern.type);
                
                if (parsedDate) {
                    candidates.push({
                        value: parsedDate.iso,
                        confidence: this.calculateDateConfidence(parsedDate, text, pattern.confidence),
                        rawValue: dateStr,
                        type: pattern.type,
                        position: match.index
                    });
                }
            }
        }
        
        if (candidates.length === 0) {
            return { value: null, confidence: 0 };
        }
        
        // Sort by confidence and select best future date
        candidates.sort((a, b) => b.confidence - a.confidence);
        
        // Prefer future dates for events
        const futureDates = candidates.filter(c => new Date(c.value) > new Date());
        const best = futureDates.length > 0 ? futureDates[0] : candidates[0];
        
        return {
            value: best.value,
            confidence: best.confidence,
            debug: this.options.debug ? { candidates, selected: best } : undefined
        };
    }
    
    /**
     * Parse date string into standardized format
     * @param {string} dateStr - Raw date string
     * @param {string} type - Date pattern type
     * @returns {Object|null} Parsed date object
     */
    parseDate(dateStr, type) {
        try {
            let date;
            
            switch (type) {
                case 'iso':
                    date = new Date(dateStr);
                    break;
                    
                case 'us_date':
                case 'us_date_dash':
                    const parts = dateStr.split(/[\/\-]/);
                    if (parts.length === 3) {
                        date = new Date(parts[2], parts[0] - 1, parts[1]);
                    }
                    break;
                    
                case 'relative':
                    date = this.parseRelativeDate(dateStr);
                    break;
                    
                default:
                    date = new Date(dateStr);
            }
            
            if (date && !isNaN(date.getTime())) {
                return {
                    iso: date.toISOString(),
                    formatted: date.toLocaleDateString(),
                    original: dateStr,
                    type: type
                };
            }
        } catch (error) {
            // Invalid date format
        }
        
        return null;
    }
    
    /**
     * Parse relative date expressions
     * @param {string} dateStr - Relative date string
     * @returns {Date|null} Parsed date
     */
    parseRelativeDate(dateStr) {
        const now = new Date();
        const lower = dateStr.toLowerCase();
        
        if (lower.includes('today')) {
            return now;
        } else if (lower.includes('tomorrow')) {
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            return tomorrow;
        } else {
            // Parse "this friday", etc.
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            for (let i = 0; i < dayNames.length; i++) {
                if (lower.includes(dayNames[i])) {
                    const targetDay = i;
                    const currentDay = now.getDay();
                    let daysToAdd = targetDay - currentDay;
                    
                    if (daysToAdd <= 0) daysToAdd += 7; // Next week if day has passed
                    
                    const targetDate = new Date(now);
                    targetDate.setDate(now.getDate() + daysToAdd);
                    return targetDate;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Calculate date confidence based on context
     * @param {Object} parsedDate - Parsed date object
     * @param {string} fullText - Full text context
     * @param {number} baseConfidence - Base confidence from pattern
     * @returns {number} Calculated confidence
     */
    calculateDateConfidence(parsedDate, fullText, baseConfidence) {
        let confidence = baseConfidence;
        const date = new Date(parsedDate.iso);
        const now = new Date();
        const daysDiff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        
        // Future date bonus (events are usually in the future)
        if (daysDiff > 0 && daysDiff < 365) {
            confidence += 15;
        } else if (daysDiff < -30) {
            confidence -= 20; // Very old date is suspicious
        }
        
        // Weekend bonus for events
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
            confidence += 5;
        }
        
        // Context clues in surrounding text
        const context = this.getTextContext(fullText, parsedDate.original, 100);
        if (/\b(show|concert|event|doors|tickets)\b/i.test(context)) {
            confidence += 10;
        }
        
        return Math.max(0, Math.min(100, confidence));
    }
    
    /**
     * Get text context around a match
     * @param {string} text - Full text
     * @param {string} match - Match to find context for
     * @param {number} contextLength - Length of context to extract
     * @returns {string} Context text
     */
    getTextContext(text, match, contextLength = 50) {
        const index = text.indexOf(match);
        if (index === -1) return '';
        
        const start = Math.max(0, index - contextLength);
        const end = Math.min(text.length, index + match.length + contextLength);
        
        return text.substring(start, end);
    }
    
    /**
     * Extract time information from text
     * @param {string} text - Processed text
     * @param {Object} context - Context data
     * @returns {Object} Extraction result
     */
    extractTime(text, context) {
        const candidates = [];
        
        for (const pattern of this.patterns.times) {
            const matches = [...text.matchAll(pattern.regex)];
            
            for (const match of matches) {
                const timeStr = match[0];
                const parsedTime = this.parseTime(timeStr, pattern.type);
                
                if (parsedTime) {
                    candidates.push({
                        value: parsedTime.normalized,
                        confidence: this.calculateTimeConfidence(parsedTime, text, pattern.confidence),
                        rawValue: timeStr,
                        type: pattern.type,
                        position: match.index,
                        context: this.getTextContext(text, timeStr, 30)
                    });
                }
            }
        }
        
        if (candidates.length === 0) {
            return { value: null, confidence: 0 };
        }
        
        // Sort by confidence
        candidates.sort((a, b) => b.confidence - a.confidence);
        const best = candidates[0];
        
        return {
            value: best.value,
            confidence: best.confidence,
            debug: this.options.debug ? { candidates, selected: best } : undefined
        };
    }
    
    /**
     * Parse time string into normalized format
     * @param {string} timeStr - Raw time string
     * @param {string} type - Time pattern type
     * @returns {Object|null} Parsed time object
     */
    parseTime(timeStr, type) {
        try {
            // Extract time components
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
            if (!timeMatch) return null;
            
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const seconds = parseInt(timeMatch[3] || 0);
            const meridiem = timeMatch[4];
            
            // Convert to 24-hour format
            if (meridiem) {
                if (meridiem.toUpperCase() === 'PM' && hours !== 12) {
                    hours += 12;
                } else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
                    hours = 0;
                }
            }
            
            // Validate time
            if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                return null;
            }
            
            return {
                normalized: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                hours,
                minutes,
                seconds,
                meridiem,
                original: timeStr,
                type
            };
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Calculate time confidence based on context and reasonableness
     * @param {Object} parsedTime - Parsed time object
     * @param {string} fullText - Full text context
     * @param {number} baseConfidence - Base confidence
     * @returns {number} Calculated confidence
     */
    calculateTimeConfidence(parsedTime, fullText, baseConfidence) {
        let confidence = baseConfidence;
        
        // Reasonable event time bonus
        const hour = parsedTime.hours;
        if (hour >= 18 || hour <= 2) { // Evening/night events
            confidence += 10;
        } else if (hour >= 10 && hour <= 16) { // Afternoon events
            confidence += 5;
        }
        
        // Context clues
        const context = this.getTextContext(fullText, parsedTime.original, 50);
        const contextLower = context.toLowerCase();
        
        if (contextLower.includes('doors')) confidence += 15;
        if (contextLower.includes('show')) confidence += 10;
        if (contextLower.includes('start')) confidence += 8;
        if (contextLower.includes('@') || contextLower.includes('at')) confidence += 5;
        
        return Math.max(0, Math.min(100, confidence));
    }
    
    /**
     * Extract venue information from text
     * @param {string} text - Processed text
     * @param {Object} context - Context data
     * @returns {Object} Extraction result
     */
    extractVenue(text, context) {
        const candidates = [];
        
        for (const pattern of this.patterns.venues) {
            const matches = [...text.matchAll(pattern.regex)];
            
            for (const match of matches) {
                const venueStr = pattern.type === 'at_venue' || pattern.type === 'venue_label' 
                    ? match[1] 
                    : match[0];
                
                const cleanVenue = this.cleanVenue(venueStr);
                
                if (this.isValidVenue(cleanVenue)) {
                    candidates.push({
                        value: cleanVenue,
                        confidence: this.calculateVenueConfidence(cleanVenue, text, pattern.confidence),
                        type: pattern.type,
                        position: match.index
                    });
                }
            }
        }
        
        if (candidates.length === 0) {
            return { value: null, confidence: 0 };
        }
        
        // Sort by confidence and return best
        candidates.sort((a, b) => b.confidence - a.confidence);
        const best = candidates[0];
        
        return {
            value: best.value,
            confidence: best.confidence,
            debug: this.options.debug ? { candidates, selected: best } : undefined
        };
    }
    
    /**
     * Clean venue name
     * @param {string} venue - Raw venue name
     * @returns {string} Cleaned venue name
     */
    cleanVenue(venue) {
        return venue
            .replace(/^\s*[@at]\s*/i, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    /**
     * Validate venue name
     * @param {string} venue - Venue name to validate
     * @returns {boolean} Is valid venue
     */
    isValidVenue(venue) {
        if (!venue || venue.length < 3 || venue.length > 80) return false;
        
        // Must have letters
        if (!/[a-zA-Z]{2,}/.test(venue)) return false;
        
        // Filter out common non-venue text
        const lower = venue.toLowerCase();
        const nonVenues = ['tickets', 'info', 'more', 'details', 'call', 'visit', 'website'];
        return !nonVenues.some(word => lower.includes(word));
    }
    
    /**
     * Calculate venue confidence
     * @param {string} venue - Venue name
     * @param {string} fullText - Full text
     * @param {number} baseConfidence - Base confidence
     * @returns {number} Calculated confidence
     */
    calculateVenueConfidence(venue, fullText, baseConfidence) {
        let confidence = baseConfidence;
        
        // Venue type keywords bonus
        const venueTypes = ['theater', 'theatre', 'hall', 'center', 'club', 'bar', 'arena', 'stadium'];
        if (venueTypes.some(type => venue.toLowerCase().includes(type))) {
            confidence += 15;
        }
        
        // Proper noun characteristics
        if (/^[A-Z]/.test(venue)) confidence += 5;
        if (/[A-Z].*[A-Z]/.test(venue)) confidence += 5; // Multiple capitals
        
        return Math.max(0, Math.min(100, confidence));
    }
    
    /**
     * Extract address from text
     * @param {string} text - Processed text
     * @param {Object} context - Context data
     * @returns {Object} Extraction result
     */
    extractAddress(text, context) {
        const addressPatterns = this.patterns.venues.filter(p => 
            p.type === 'street_address'
        );
        
        const candidates = [];
        
        for (const pattern of addressPatterns) {
            const matches = [...text.matchAll(pattern.regex)];
            
            for (const match of matches) {
                const address = match[0].trim();
                
                if (this.isValidAddress(address)) {
                    candidates.push({
                        value: address,
                        confidence: pattern.confidence,
                        type: pattern.type,
                        position: match.index
                    });
                }
            }
        }
        
        if (candidates.length === 0) {
            return { value: null, confidence: 0 };
        }
        
        // Sort by confidence
        candidates.sort((a, b) => b.confidence - a.confidence);
        const best = candidates[0];
        
        return {
            value: best.value,
            confidence: best.confidence,
            debug: this.options.debug ? { candidates } : undefined
        };
    }
    
    /**
     * Validate address
     * @param {string} address - Address to validate
     * @returns {boolean} Is valid address
     */
    isValidAddress(address) {
        if (!address || address.length < 8 || address.length > 150) return false;
        
        // Must have number at start
        if (!/^\d+/.test(address)) return false;
        
        // Must have street type
        const streetTypes = ['St', 'Street', 'Ave', 'Avenue', 'Rd', 'Road', 'Blvd', 'Boulevard', 'Dr', 'Drive'];
        return streetTypes.some(type => address.includes(type));
    }
    
    /**
     * Extract price information from text
     * @param {string} text - Processed text
     * @param {Object} context - Context data
     * @returns {Object} Extraction result
     */
    extractPrice(text, context) {
        const candidates = [];
        
        for (const pattern of this.patterns.prices) {
            const matches = [...text.matchAll(pattern.regex)];
            
            for (const match of matches) {
                const priceStr = match[0];
                const priceData = this.parsePrice(priceStr, pattern.type);
                
                if (priceData) {
                    candidates.push({
                        value: priceData,
                        confidence: this.calculatePriceConfidence(priceData, text, pattern.confidence),
                        type: pattern.type,
                        position: match.index
                    });
                }
            }
        }
        
        if (candidates.length === 0) {
            return { value: null, confidence: 0 };
        }
        
        // Sort by confidence
        candidates.sort((a, b) => b.confidence - a.confidence);
        const best = candidates[0];
        
        return {
            value: best.value,
            confidence: best.confidence,
            debug: this.options.debug ? { candidates } : undefined
        };
    }
    
    /**
     * Parse price string
     * @param {string} priceStr - Price string
     * @param {string} type - Price pattern type
     * @returns {Object|null} Price data
     */
    parsePrice(priceStr, type) {
        try {
            if (type === 'free') {
                return {
                    free: true,
                    amount: 0,
                    currency: 'USD',
                    raw: priceStr,
                    type
                };
            }
            
            // Extract numeric value
            const numMatch = priceStr.match(/\d+(?:\.\d{2})?/);
            if (!numMatch) return null;
            
            const amount = parseFloat(numMatch[0]);
            
            return {
                free: amount === 0,
                amount,
                currency: 'USD', // Default to USD
                raw: priceStr,
                type
            };
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Calculate price confidence
     * @param {Object} priceData - Price data
     * @param {string} fullText - Full text
     * @param {number} baseConfidence - Base confidence
     * @returns {number} Calculated confidence
     */
    calculatePriceConfidence(priceData, fullText, baseConfidence) {
        let confidence = baseConfidence;
        
        // Reasonable price range bonus
        if (priceData.amount >= 0 && priceData.amount <= 200) {
            confidence += 5;
        }
        
        // Free event bonus
        if (priceData.free) {
            confidence += 10;
        }
        
        // Context clues
        const context = this.getTextContext(fullText, priceData.raw, 50);
        const contextLower = context.toLowerCase();
        
        if (contextLower.includes('ticket')) confidence += 10;
        if (contextLower.includes('admission')) confidence += 8;
        if (contextLower.includes('advance')) confidence += 5;
        if (contextLower.includes('door')) confidence += 5;
        
        return Math.max(0, Math.min(100, confidence));
    }
    
    /**
     * Extract description from text
     * @param {string} text - Processed text
     * @param {Object} context - Context data
     * @returns {Object} Extraction result
     */
    extractDescription(text, context) {
        // Look for paragraphs or longer text blocks
        const lines = text.split('\n');
        const candidates = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length >= 50 && trimmed.length <= 500) {
                // Check if it's descriptive text (not title, date, etc.)
                if (this.isDescriptiveText(trimmed)) {
                    candidates.push({
                        value: trimmed,
                        confidence: this.calculateDescriptionConfidence(trimmed, text),
                        length: trimmed.length
                    });
                }
            }
        }
        
        if (candidates.length === 0) {
            return { value: null, confidence: 0 };
        }
        
        // Prefer longer descriptions
        candidates.sort((a, b) => b.confidence - a.confidence);
        const best = candidates[0];
        
        return {
            value: best.value,
            confidence: best.confidence,
            debug: this.options.debug ? { candidates } : undefined
        };
    }
    
    /**
     * Check if text is descriptive
     * @param {string} text - Text to check
     * @returns {boolean} Is descriptive
     */
    isDescriptiveText(text) {
        // Must have reasonable word count
        const words = text.split(/\s+/);
        if (words.length < 8) return false;
        
        // Shouldn't be mostly numbers or symbols
        const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
        if (letterCount / text.length < 0.6) return false;
        
        // Filter out titles and other non-descriptive text
        const lower = text.toLowerCase();
        
        // Skip if it looks like a title (all caps, short phrases)
        if (text === text.toUpperCase() && words.length < 10) return false;
        
        // Skip if it contains mostly dates, times, prices
        const specialCount = (text.match(/[\d\$:]/g) || []).length;
        if (specialCount / text.length > 0.3) return false;
        
        return true;
    }
    
    /**
     * Calculate description confidence
     * @param {string} description - Description text
     * @param {string} fullText - Full text
     * @returns {number} Confidence score
     */
    calculateDescriptionConfidence(description, fullText) {
        let confidence = 60; // Base confidence for descriptions
        
        // Length bonus (prefer substantial descriptions)
        if (description.length >= 100) confidence += 10;
        if (description.length >= 200) confidence += 5;
        
        // Content quality indicators
        if (/\b(featuring|with|special\s+guest|music|performance)\b/i.test(description)) {
            confidence += 10;
        }
        
        // Well-formed sentence bonus
        if (description.includes('.') && description.includes(' ')) {
            confidence += 5;
        }
        
        return Math.min(100, confidence);
    }
    
    /**
     * Post-process and validate extraction results
     * @param {Object} results - Extraction results
     * @param {string} text - Full text
     * @param {Object} context - Context data
     */
    postProcessResults(results, text, context) {
        // Combine date and time if both exist
        if (results.data.date && results.data.time && !results.data.date.includes('T')) {
            try {
                const dateObj = new Date(results.data.date);
                const [hours, minutes, seconds] = results.data.time.split(':').map(Number);
                
                dateObj.setHours(hours, minutes, seconds);
                
                results.data.startDateTime = dateObj.toISOString();
                results.confidence.startDateTime = Math.min(
                    results.confidence.date || 0,
                    results.confidence.time || 0
                );
            } catch (error) {
                // Keep separate if combination fails
            }
        }
        
        // Ensure address has comma if extracted
        if (results.data.address && !results.data.address.includes(',')) {
            // Try to add intelligent comma placement
            const words = results.data.address.split(' ');
            if (words.length >= 4) {
                const midPoint = Math.floor(words.length / 2);
                const streetPart = words.slice(0, midPoint).join(' ');
                const cityPart = words.slice(midPoint).join(' ');
                results.data.address = `${streetPart}, ${cityPart}`;
            }
        }
        
        // Clean up any extracted values
        for (const [key, value] of Object.entries(results.data)) {
            if (typeof value === 'string') {
                results.data[key] = value.trim();
            }
        }
    }
    
    /**
     * Get or create a Tesseract worker
     * @returns {Promise<Worker>} Tesseract worker
     */
    async getWorker() {
        // Check for available worker in pool
        if (this.workerPool.length > 0) {
            return this.workerPool.pop();
        }
        
        // Create new worker if under limit
        if (this.activeWorkers < this.maxWorkers) {
            this.activeWorkers++;
            
            const worker = await Tesseract.createWorker({
                logger: this.options.verbose ? m => console.log(chalk.gray(`[OCR] ${m.status}: ${m.progress}`)) : undefined,
                ...this.options.tesseractWorkerOptions
            });
            
            await worker.loadLanguage(this.options.tesseractWorkerOptions.languages);
            await worker.initialize(this.options.tesseractWorkerOptions.languages);
            
            // Configure OCR parameters for better text extraction
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,!?@#$%&*()[]{}:;-_+=|\\/<>\'\"',
                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                preserve_interword_spaces: '1',
            });
            
            return worker;
        }
        
        // Wait for worker to become available
        return new Promise((resolve) => {
            const checkForWorker = () => {
                if (this.workerPool.length > 0) {
                    resolve(this.workerPool.pop());
                } else {
                    setTimeout(checkForWorker, 100);
                }
            };
            checkForWorker();
        });
    }
    
    /**
     * Return worker to pool
     * @param {Worker} worker - Tesseract worker
     */
    async returnWorker(worker) {
        if (worker && this.workerPool.length < this.maxWorkers) {
            this.workerPool.push(worker);
        } else if (worker) {
            await worker.terminate();
            this.activeWorkers--;
        }
    }
    
    /**
     * Clean up resources
     */
    async cleanup() {
        this.log(chalk.blue('🧹 Cleaning up OCR resources...'));
        
        // Terminate all workers
        const terminatePromises = [];
        
        for (const worker of this.workerPool) {
            terminatePromises.push(worker.terminate());
        }
        
        await Promise.all(terminatePromises);
        
        this.workerPool = [];
        this.activeWorkers = 0;
        
        // Clear caches
        this.ocrCache.clear();
        this.imageCache.clear();
        
        this.log(chalk.green('✅ Cleanup complete'));
    }
    
    /**
     * Get extraction statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            cache: {
                ocr: this.ocrCache.size,
                images: this.imageCache.size
            },
            workers: {
                active: this.activeWorkers,
                pooled: this.workerPool.length,
                max: this.maxWorkers
            },
            options: {
                timeout: this.options.timeout,
                maxRetries: this.options.maxRetries,
                languages: this.options.tesseractWorkerOptions.languages
            }
        };
    }
}

module.exports = FlyerTextExtractor;