#!/usr/bin/env node

/**
 * OCR Test Framework for Hash Event Scraper
 * 
 * Comprehensive testing framework for OCR functionality including:
 * - Text extraction accuracy validation
 * - Performance benchmarking
 * - Integration with Universal Extractor
 * - Various flyer type testing
 * - Error handling and edge cases
 * 
 * @version 1.0.0
 * @author Claude Code - QA Testing Specialist
 */

const { chromium } = require('playwright');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const { performance } = require('perf_hooks');
const { getOcrConfig, getFlyerTypeConfig, validateOcrConfig } = require('./ocrTestConfig');
const UniversalExtractor = require('../utils/universalExtractor');

class OCRTestFramework {
    constructor(options = {}) {
        this.options = {
            environment: options.environment || 'development',
            verbose: options.verbose !== false,
            generateReports: options.generateReports !== false,
            saveProcessedImages: options.saveProcessedImages || false,
            ...options
        };
        
        this.config = getOcrConfig(this.options.environment);
        this.tesseractWorker = null;
        
        // Test results tracking
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            testResults: {},
            performanceMetrics: {
                totalTime: 0,
                averageTime: 0,
                fastestTime: Infinity,
                slowestTime: 0,
                memoryUsage: [],
                accuracyStats: []
            },
            accuracyByType: {},
            errorAnalysis: {}
        };
        
        // Text similarity thresholds for accuracy calculation
        this.similarityThresholds = {
            excellent: 0.95,
            good: 0.85,
            acceptable: 0.75,
            poor: 0.60
        };
        
        this.log = this.config.verbose ? console.log : () => {};
        this.logError = console.error;
    }
    
    /**
     * Initialize OCR testing framework
     */
    async initialize() {
        try {
            console.log(chalk.blue('🔧 Initializing OCR Test Framework...'));
            
            // Create output directories
            await this.ensureDirectories();
            
            // Initialize Tesseract worker
            await this.initializeTesseract();
            
            // Validate configuration
            const configValidation = validateOcrConfig(this.config);
            if (!configValidation.valid) {
                throw new Error(`Invalid OCR config: ${configValidation.errors.join(', ')}`);
            }
            
            console.log(chalk.green('✅ OCR Test Framework initialized successfully'));
            return true;
            
        } catch (error) {
            this.logError(chalk.red(`❌ Failed to initialize OCR Test Framework: ${error.message}`));
            return false;
        }
    }
    
    /**
     * Initialize Tesseract OCR engine
     */
    async initializeTesseract() {
        try {
            console.log(chalk.cyan('🤖 Initializing Tesseract OCR engine...'));
            
            this.tesseractWorker = await Tesseract.createWorker('eng', 1, {
                logger: this.config.verbose ? (m) => {
                    if (m.status === 'recognizing text') {
                        process.stdout.write(`\r${chalk.gray('   OCR Progress: ' + Math.round(m.progress * 100) + '%')}`);
                    }
                } : undefined
            });
            
            // Configure Tesseract parameters for better accuracy
            await this.tesseractWorker.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz !@#$%^&*()_+-=[]{}|;:,.<>?/',
                tessedit_pageseg_mode: Tesseract.PSM.AUTO_OSD, // Automatic page segmentation with orientation detection
                preserve_interword_spaces: '1'
            });
            
            console.log(chalk.green('✅ Tesseract OCR engine ready'));
            
        } catch (error) {
            throw new Error(`Tesseract initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Ensure all required directories exist
     */
    async ensureDirectories() {
        const dirs = [
            this.config.outputDir,
            path.join(this.config.outputDir, 'processed'),
            path.join(this.config.outputDir, 'reports'),
            path.join(this.config.outputDir, 'fixtures'),
            path.join(this.config.outputDir, 'debug')
        ];
        
        for (const dir of dirs) {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
                this.log(chalk.gray(`   Created directory: ${dir}`));
            }
        }
    }
    
    /**
     * Run comprehensive OCR test suite
     */
    async runFullTestSuite() {
        console.log(chalk.blue('🧪 Starting OCR Test Suite...'));
        const startTime = performance.now();
        
        try {
            // Unit tests for text extraction accuracy
            console.log(chalk.yellow('\n📝 Running Text Extraction Accuracy Tests...'));
            await this.runTextExtractionTests();
            
            // Performance benchmarking tests
            console.log(chalk.yellow('\n⚡ Running Performance Benchmark Tests...'));
            await this.runPerformanceTests();
            
            // Flyer type specific tests
            console.log(chalk.yellow('\n🎭 Running Flyer Type Tests...'));
            await this.runFlyerTypeTests();
            
            // Integration tests with Universal Extractor
            console.log(chalk.yellow('\n🔗 Running Integration Tests...'));
            await this.runIntegrationTests();
            
            // Error handling and edge case tests
            console.log(chalk.yellow('\n🛡️  Running Error Handling Tests...'));
            await this.runErrorHandlingTests();
            
            // Calculate final metrics
            const totalTime = performance.now() - startTime;
            this.results.performanceMetrics.totalTime = totalTime;
            
            // Generate comprehensive report
            if (this.options.generateReports) {
                await this.generateComprehensiveReport();
            }
            
            // Display results summary
            this.displayResultsSummary();
            
            return this.results;
            
        } catch (error) {
            this.logError(chalk.red(`❌ Test suite failed: ${error.message}`));
            throw error;
        }
    }
    
    /**
     * Run text extraction accuracy tests
     */
    async runTextExtractionTests() {
        const testCases = await this.loadTextExtractionTestCases();
        
        for (const testCase of testCases) {
            try {
                console.log(chalk.cyan(`   Testing: ${testCase.name}`));
                const startTime = performance.now();
                
                // Process image and extract text
                const result = await this.extractTextFromImage(testCase.imagePath, testCase.options);
                const duration = performance.now() - startTime;
                
                // Calculate accuracy against ground truth
                const accuracy = this.calculateTextAccuracy(result.text, testCase.expectedText);
                
                // Validate against quality thresholds
                const passed = this.validateTextExtractionResult(result, testCase, accuracy);
                
                // Store test result
                this.storeTestResult('textExtraction', testCase.name, {
                    passed,
                    accuracy,
                    extractedText: result.text,
                    expectedText: testCase.expectedText,
                    confidence: result.confidence,
                    duration,
                    errors: result.errors || []
                });
                
                this.log(chalk.green(`   ✅ Accuracy: ${accuracy.toFixed(1)}% (${duration.toFixed(0)}ms)`));
                
            } catch (error) {
                this.storeTestResult('textExtraction', testCase.name, {
                    passed: false,
                    error: error.message,
                    duration: 0
                });
                
                this.logError(chalk.red(`   ❌ Failed: ${error.message}`));
            }
        }
    }
    
    /**
     * Extract text from image using OCR
     */
    async extractTextFromImage(imagePath, options = {}) {
        try {
            // Preprocess image for better OCR accuracy
            const processedImagePath = await this.preprocessImage(imagePath, options);
            
            // Perform OCR
            const ocrResult = await this.tesseractWorker.recognize(processedImagePath);
            
            // Clean up processed image if not saving
            if (!this.config.saveProcessedImages && processedImagePath !== imagePath) {
                await fs.unlink(processedImagePath).catch(() => {}); // Silent fail
            }
            
            // Parse and structure the results
            const structuredResult = this.parseOcrResult(ocrResult);
            
            return {
                text: ocrResult.data.text.trim(),
                confidence: ocrResult.data.confidence,
                words: ocrResult.data.words,
                lines: ocrResult.data.lines,
                structured: structuredResult,
                rawResult: this.config.verbose ? ocrResult.data : null
            };
            
        } catch (error) {
            throw new Error(`OCR extraction failed: ${error.message}`);
        }
    }
    
    /**
     * Preprocess image to improve OCR accuracy
     */
    async preprocessImage(imagePath, options = {}) {
        try {
            const image = sharp(imagePath);
            const metadata = await image.metadata();
            
            let pipeline = image;
            const outputPath = path.join(
                this.config.outputDir,
                'processed',
                `processed_${Date.now()}_${path.basename(imagePath)}`
            );
            
            // Resize if image is too large
            const maxDimension = options.maxDimension || 2048;
            if (metadata.width > maxDimension || metadata.height > maxDimension) {
                pipeline = pipeline.resize(maxDimension, maxDimension, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }
            
            // Enhance contrast and sharpness for better text recognition
            pipeline = pipeline
                .grayscale() // Convert to grayscale
                .normalize() // Normalize contrast
                .sharpen({ sigma: 1.0 }) // Sharpen text edges
                .threshold(128); // Apply threshold for better text separation
            
            await pipeline.png().toFile(outputPath);
            
            return outputPath;
            
        } catch (error) {
            // If preprocessing fails, return original path
            this.log(chalk.yellow(`   ⚠️  Image preprocessing failed, using original: ${error.message}`));
            return imagePath;
        }
    }
    
    /**
     * Parse OCR result to extract structured information
     */
    parseOcrResult(ocrResult) {
        const structured = {
            titles: [],
            dates: [],
            times: [],
            prices: [],
            addresses: [],
            phoneNumbers: [],
            emails: [],
            urls: []
        };
        
        const text = ocrResult.data.text;
        
        // Extract titles (lines with high confidence and larger font)
        for (const line of ocrResult.data.lines) {
            if (line.confidence > 80 && line.bbox.height > 20) {
                structured.titles.push(line.text.trim());
            }
        }
        
        // Extract dates using regex patterns
        const datePatterns = [
            /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
            /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,
            /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b/gi
        ];
        
        for (const pattern of datePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                structured.dates.push(...matches);
            }
        }
        
        // Extract times
        const timePattern = /\b\d{1,2}:\d{2}\s*(AM|PM)?\b/gi;
        const timeMatches = text.match(timePattern);
        if (timeMatches) {
            structured.times.push(...timeMatches);
        }
        
        // Extract prices
        const pricePatterns = [
            /\$\d+(?:\.\d{2})?/g,
            /\b\d+\s*dollars?\b/gi,
            /\bfree\b/gi
        ];
        
        for (const pattern of pricePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                structured.prices.push(...matches);
            }
        }
        
        // Extract phone numbers
        const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
        const phoneMatches = text.match(phonePattern);
        if (phoneMatches) {
            structured.phoneNumbers.push(...phoneMatches);
        }
        
        // Extract emails
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emailMatches = text.match(emailPattern);
        if (emailMatches) {
            structured.emails.push(...emailMatches);
        }
        
        // Extract URLs
        const urlPattern = /https?:\/\/[^\s]+/g;
        const urlMatches = text.match(urlPattern);
        if (urlMatches) {
            structured.urls.push(...urlMatches);
        }
        
        return structured;
    }
    
    /**
     * Calculate text accuracy using string similarity metrics
     */
    calculateTextAccuracy(extractedText, expectedText) {
        if (!expectedText || !extractedText) return 0;
        
        // Normalize texts for comparison
        const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
        
        const normalizedExtracted = normalize(extractedText);
        const normalizedExpected = normalize(expectedText);
        
        // Calculate Levenshtein distance
        const distance = this.levenshteinDistance(normalizedExtracted, normalizedExpected);
        const maxLength = Math.max(normalizedExtracted.length, normalizedExpected.length);
        
        if (maxLength === 0) return 100; // Both strings are empty
        
        const accuracy = ((maxLength - distance) / maxLength) * 100;
        return Math.max(0, Math.min(100, accuracy));
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Validate text extraction result against quality thresholds
     */
    validateTextExtractionResult(result, testCase, accuracy) {
        let passed = true;
        const errors = [];
        
        // Check minimum accuracy
        const requiredAccuracy = testCase.minAccuracy || this.config.quality.accuracy.generalText.minAccuracy;
        if (accuracy < requiredAccuracy) {
            passed = false;
            errors.push(`Accuracy ${accuracy.toFixed(1)}% below required ${requiredAccuracy}%`);
        }
        
        // Check confidence threshold
        const requiredConfidence = testCase.minConfidence || this.config.quality.accuracy.generalText.confidenceThreshold;
        if (result.confidence < requiredConfidence) {
            passed = false;
            errors.push(`Confidence ${result.confidence.toFixed(2)} below required ${requiredConfidence}`);
        }
        
        // Check for specific patterns if required
        if (testCase.requiredPatterns) {
            for (const pattern of testCase.requiredPatterns) {
                if (!pattern.test(result.text)) {
                    passed = false;
                    errors.push(`Required pattern not found: ${pattern}`);
                }
            }
        }
        
        return passed;
    }
    
    /**
     * Load text extraction test cases
     */
    async loadTextExtractionTestCases() {
        const testCases = [];
        
        // Load ground truth data
        const groundTruth = this.config.groundTruth || {};
        
        for (const [imageFile, expectedData] of Object.entries(groundTruth)) {
            const imagePath = path.join(__dirname, 'fixtures', 'images', imageFile);
            
            // Check if image file exists
            try {
                await fs.access(imagePath);
                
                testCases.push({
                    name: imageFile,
                    imagePath: imagePath,
                    expectedText: this.buildExpectedText(expectedData),
                    expectedData: expectedData,
                    minAccuracy: expectedData.accuracy || 75,
                    options: {
                        maxDimension: 2048,
                        enhanceContrast: true
                    }
                });
                
            } catch (error) {
                this.log(chalk.yellow(`   ⚠️  Skipping missing test image: ${imageFile}`));
            }
        }
        
        // If no test cases from ground truth, create synthetic ones
        if (testCases.length === 0) {
            testCases.push(...this.createSyntheticTestCases());
        }
        
        return testCases;
    }
    
    /**
     * Build expected text from structured data
     */
    buildExpectedText(expectedData) {
        const parts = [];
        
        if (expectedData.title) parts.push(expectedData.title);
        if (expectedData.artist || expectedData.eventName || expectedData.dj) {
            parts.push(expectedData.artist || expectedData.eventName || expectedData.dj);
        }
        if (expectedData.venue) parts.push(expectedData.venue);
        if (expectedData.date) parts.push(expectedData.date);
        if (expectedData.time) parts.push(expectedData.time);
        if (expectedData.price) parts.push(expectedData.price);
        if (expectedData.age) parts.push(expectedData.age);
        
        return parts.join(' ');
    }
    
    /**
     * Create synthetic test cases for basic validation
     */
    createSyntheticTestCases() {
        return [
            {
                name: 'synthetic_clear_text',
                imagePath: null, // Will be generated
                expectedText: 'CONCERT TONIGHT MAIN VENUE 8:00 PM $25',
                minAccuracy: 95,
                synthetic: true
            },
            {
                name: 'synthetic_mixed_content',
                imagePath: null,
                expectedText: 'DJ NIGHT CLUB DOWNTOWN 10 PM 21+ FREE BEFORE 11',
                minAccuracy: 85,
                synthetic: true
            }
        ];
    }
    
    /**
     * Store test result
     */
    storeTestResult(category, testName, result) {
        if (!this.results.testResults[category]) {
            this.results.testResults[category] = {};
        }
        
        this.results.testResults[category][testName] = {
            ...result,
            timestamp: new Date().toISOString()
        };
        
        this.results.total++;
        if (result.passed) {
            this.results.passed++;
        } else {
            this.results.failed++;
        }
        
        // Track performance metrics
        if (result.duration) {
            this.results.performanceMetrics.fastestTime = Math.min(
                this.results.performanceMetrics.fastestTime,
                result.duration
            );
            this.results.performanceMetrics.slowestTime = Math.max(
                this.results.performanceMetrics.slowestTime,
                result.duration
            );
        }
        
        // Track accuracy statistics
        if (result.accuracy !== undefined) {
            this.results.performanceMetrics.accuracyStats.push(result.accuracy);
        }
    }
    
    /**
     * Display results summary
     */
    displayResultsSummary() {
        console.log(chalk.blue('\n📊 OCR Test Results Summary'));
        console.log(chalk.blue('=' .repeat(50)));
        
        const passRate = this.results.total > 0 ? 
            ((this.results.passed / this.results.total) * 100).toFixed(1) : '0';
        
        console.log(chalk.cyan(`Total Tests: ${this.results.total}`));
        console.log(chalk.green(`Passed: ${this.results.passed}`));
        console.log(chalk.red(`Failed: ${this.results.failed}`));
        console.log(chalk.yellow(`Pass Rate: ${passRate}%`));
        
        if (this.results.performanceMetrics.accuracyStats.length > 0) {
            const avgAccuracy = this.results.performanceMetrics.accuracyStats
                .reduce((a, b) => a + b, 0) / this.results.performanceMetrics.accuracyStats.length;
            console.log(chalk.cyan(`Average Accuracy: ${avgAccuracy.toFixed(1)}%`));
        }
        
        if (this.results.performanceMetrics.fastestTime !== Infinity) {
            console.log(chalk.cyan(`Fastest Test: ${this.results.performanceMetrics.fastestTime.toFixed(0)}ms`));
            console.log(chalk.cyan(`Slowest Test: ${this.results.performanceMetrics.slowestTime.toFixed(0)}ms`));
        }
        
        console.log(chalk.cyan(`Total Time: ${(this.results.performanceMetrics.totalTime / 1000).toFixed(1)}s`));
        console.log(chalk.blue('=' .repeat(50)));
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            if (this.tesseractWorker) {
                await this.tesseractWorker.terminate();
                console.log(chalk.gray('🧹 Tesseract worker terminated'));
            }
            
            // Clean up temporary processed images
            const processedDir = path.join(this.config.outputDir, 'processed');
            try {
                const files = await fs.readdir(processedDir);
                for (const file of files) {
                    if (file.startsWith('processed_')) {
                        await fs.unlink(path.join(processedDir, file));
                    }
                }
            } catch (error) {
                // Silent cleanup failure
            }
            
        } catch (error) {
            this.log(chalk.yellow(`⚠️  Cleanup warning: ${error.message}`));
        }
    }
}

module.exports = OCRTestFramework;
