#!/usr/bin/env node

/**
 * Mad Oak Bar Page Structure Analyzer
 * 
 * Deep analysis script to understand the Mad Oak Bar page structure,
 * why traditional text extraction fails, and how OCR can complement it.
 * 
 * This script provides detailed insights into:
 * - DOM structure and layout patterns
 * - Text vs image content distribution
 * - JavaScript rendering detection
 * - CSS styling that might hide content
 * - Event container identification
 * 
 * @author Claude Code Analysis Suite
 * @version 1.0.0
 */

const { chromium } = require('playwright');
const chalk = require('chalk');
const fs = require('fs').promises;

class MadOakStructureAnalyzer {
    constructor() {
        this.url = 'https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings';
        this.browser = null;
        this.page = null;
        this.analysis = {
            timestamp: new Date().toISOString(),
            url: this.url,
            domStructure: {},
            textAnalysis: {},
            imageAnalysis: {},
            eventStructure: {},
            renderingAnalysis: {},
            cssAnalysis: {},
            recommendations: []
        };
    }

    async init() {
        console.log(chalk.blue('🔍 Initializing Mad Oak Bar Structure Analyzer...'));
        
        this.browser = await chromium.launch({ headless: false });
        const context = await this.browser.newContext({
            viewport: { width: 1440, height: 900 }
        });
        this.page = await context.newPage();
        
        // Enable console logging from page
        this.page.on('console', msg => {
            if (msg.type() === 'log') {
                console.log(chalk.gray(`[PAGE]: ${msg.text()}`));
            }
        });
    }

    async loadAndAnalyzePage() {
        console.log(chalk.yellow('📄 Loading page and analyzing initial structure...'));
        
        // Track network requests to understand content loading
        const requests = [];
        this.page.on('request', request => {
            requests.push({
                url: request.url(),
                method: request.method(),
                resourceType: request.resourceType()
            });
        });
        
        await this.page.goto(this.url, { waitUntil: 'networkidle' });
        
        // Wait for dynamic content
        await this.page.waitForTimeout(5000);
        
        this.analysis.networkRequests = {
            total: requests.length,
            images: requests.filter(r => r.resourceType === 'image').length,
            scripts: requests.filter(r => r.resourceType === 'script').length,
            xhr: requests.filter(r => r.resourceType === 'xhr').length,
            fetch: requests.filter(r => r.resourceType === 'fetch').length
        };
        
        console.log(chalk.blue(`📊 Network: ${requests.length} requests, ${this.analysis.networkRequests.images} images, ${this.analysis.networkRequests.scripts} scripts`));
    }

    async analyzeDomStructure() {
        console.log(chalk.yellow('🏗️  Analyzing DOM structure...'));
        
        const domAnalysis = await this.page.evaluate(() => {
            const getElementInfo = (element) => ({
                tagName: element.tagName,
                className: element.className,
                id: element.id,
                textContent: element.textContent?.substring(0, 100) || '',
                children: element.children.length,
                bounds: element.getBoundingClientRect()
            });
            
            // Analyze main container structure
            const containers = [];
            const possibleEventContainers = [
                'div[class*="event"]',
                'div[class*="happening"]', 
                'section[class*="event"]',
                'article',
                '.event-item',
                '.happening-item',
                '[data-event]'
            ];
            
            possibleEventContainers.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    containers.push({
                        selector,
                        count: elements.length,
                        elements: Array.from(elements).slice(0, 3).map(getElementInfo)
                    });
                }
            });
            
            // Analyze overall page structure
            const structure = {
                title: document.title,
                bodyClasses: document.body.className,
                hasMain: !!document.querySelector('main'),
                hasAside: !!document.querySelector('aside'),
                hasHeader: !!document.querySelector('header'),
                hasFooter: !!document.querySelector('footer'),
                totalElements: document.querySelectorAll('*').length,
                divCount: document.querySelectorAll('div').length,
                sectionCount: document.querySelectorAll('section').length,
                articleCount: document.querySelectorAll('article').length
            };
            
            return {
                containers,
                structure,
                possibleEventSelectors: possibleEventContainers
            };
        });
        
        this.analysis.domStructure = domAnalysis;
        console.log(chalk.green(`✅ Found ${domAnalysis.containers.length} potential event container patterns`));
    }

    async analyzeTextDistribution() {
        console.log(chalk.yellow('📝 Analyzing text content distribution...'));
        
        const textAnalysis = await this.page.evaluate(() => {
            const allElements = document.querySelectorAll('*');
            const textElements = [];
            const headings = [];
            const links = [];
            
            // Analyze text distribution across elements
            Array.from(allElements).forEach(el => {
                const text = el.textContent?.trim();
                const directText = el.childNodes.length > 0 ? 
                    Array.from(el.childNodes)
                        .filter(node => node.nodeType === Node.TEXT_NODE)
                        .map(node => node.textContent.trim())
                        .join(' ')
                        .trim() : '';
                
                if (directText && directText.length > 10) {
                    textElements.push({
                        tagName: el.tagName,
                        className: el.className,
                        text: directText.substring(0, 200),
                        length: directText.length,
                        bounds: el.getBoundingClientRect()
                    });
                }
                
                // Collect headings
                if (/^H[1-6]$/.test(el.tagName)) {
                    headings.push({
                        level: el.tagName,
                        text: text?.substring(0, 200) || '',
                        className: el.className
                    });
                }
                
                // Collect links
                if (el.tagName === 'A' && text) {
                    links.push({
                        text: text.substring(0, 100),
                        href: el.href,
                        className: el.className
                    });
                }
            });
            
            // Search for event-related keywords
            const eventKeywords = [
                'trivia', 'karaoke', 'event', 'happening', 'night', 'wednesday', 'tuesday',
                'pm', 'am', 'september', 'time', 'date', 'music', 'entertainment'
            ];
            
            const keywordMatches = [];
            const bodyText = document.body.textContent.toLowerCase();
            
            eventKeywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = bodyText.match(regex);
                if (matches) {
                    keywordMatches.push({
                        keyword,
                        count: matches.length,
                        positions: []
                    });
                }
            });
            
            return {
                totalTextLength: document.body.textContent.length,
                uniqueTextElements: textElements.length,
                headings: headings,
                links: links.slice(0, 10), // Limit links for readability
                keywordMatches,
                eventKeywordDensity: keywordMatches.reduce((sum, match) => sum + match.count, 0)
            };
        });
        
        this.analysis.textAnalysis = textAnalysis;
        console.log(chalk.green(`✅ Text analysis complete: ${textAnalysis.totalTextLength} chars, ${textAnalysis.eventKeywordDensity} event keywords`));
    }

    async analyzeImages() {
        console.log(chalk.yellow('🖼️  Analyzing images and potential flyers...'));
        
        const imageAnalysis = await this.page.evaluate(() => {
            const images = Array.from(document.querySelectorAll('img'));
            
            const imageData = images.map((img, index) => {
                const rect = img.getBoundingClientRect();
                const parent = img.parentElement;
                const grandparent = parent?.parentElement;
                
                return {
                    index,
                    src: img.src,
                    alt: img.alt || '',
                    title: img.title || '',
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    displayWidth: rect.width,
                    displayHeight: rect.height,
                    aspectRatio: img.naturalWidth / img.naturalHeight,
                    isVisible: rect.width > 0 && rect.height > 0,
                    parentTag: parent?.tagName,
                    parentClass: parent?.className || '',
                    grandparentClass: grandparent?.className || '',
                    position: {
                        x: rect.x,
                        y: rect.y
                    },
                    // Check if image might be a flyer
                    likelyFlyer: (img.alt.toLowerCase().includes('event') ||
                                 img.alt.toLowerCase().includes('flyer') ||
                                 img.src.toLowerCase().includes('event') ||
                                 img.src.toLowerCase().includes('flyer') ||
                                 (rect.width > 200 && rect.height > 200)) // Large images
                };
            });
            
            // Group images by size categories
            const sizeCategories = {
                large: imageData.filter(img => img.displayWidth > 300 || img.displayHeight > 300),
                medium: imageData.filter(img => img.displayWidth >= 100 && img.displayWidth <= 300),
                small: imageData.filter(img => img.displayWidth < 100),
                invisible: imageData.filter(img => !img.isVisible)
            };
            
            // Look for event-specific image patterns
            const eventImages = imageData.filter(img => {
                const textContent = (img.alt + ' ' + img.title + ' ' + img.src).toLowerCase();
                return textContent.includes('trivia') || 
                       textContent.includes('karaoke') ||
                       textContent.includes('event') ||
                       textContent.includes('happening') ||
                       img.likelyFlyer;
            });
            
            return {
                totalImages: images.length,
                visibleImages: imageData.filter(img => img.isVisible).length,
                sizeCategories,
                eventImages,
                averageSize: {
                    width: imageData.reduce((sum, img) => sum + img.displayWidth, 0) / imageData.length,
                    height: imageData.reduce((sum, img) => sum + img.displayHeight, 0) / imageData.length
                },
                aspectRatios: imageData.map(img => img.aspectRatio).filter(ratio => !isNaN(ratio))
            };
        });
        
        this.analysis.imageAnalysis = imageAnalysis;
        console.log(chalk.green(`✅ Image analysis complete: ${imageAnalysis.totalImages} total, ${imageAnalysis.eventImages.length} likely event images`));
    }

    async analyzeEventStructure() {
        console.log(chalk.yellow('🎯 Analyzing event-specific structure patterns...'));
        
        const eventStructure = await this.page.evaluate(() => {
            // Look for layout patterns typical of event listings
            const layoutPatterns = [];
            
            // Pattern 1: Side-by-side layout (image + text)
            const potentialSideBySide = document.querySelectorAll('div');
            Array.from(potentialSideBySide).forEach((div, index) => {
                const img = div.querySelector('img');
                const textContent = div.textContent?.trim() || '';
                
                if (img && textContent.length > 50) {
                    const rect = div.getBoundingClientRect();
                    layoutPatterns.push({
                        type: 'image_text_combo',
                        element: `div[${index}]`,
                        className: div.className,
                        hasImage: true,
                        textLength: textContent.length,
                        bounds: rect,
                        textPreview: textContent.substring(0, 100)
                    });
                }
            });
            
            // Pattern 2: Grid/card layouts
            const gridPatterns = [
                '.grid', '.cards', '.events', '.happenings',
                '[class*="grid"]', '[class*="card"]', '[class*="event"]'
            ].map(selector => {
                const elements = document.querySelectorAll(selector);
                return {
                    selector,
                    count: elements.length,
                    elements: Array.from(elements).slice(0, 3).map(el => ({
                        className: el.className,
                        children: el.children.length,
                        textContent: el.textContent?.substring(0, 100) || ''
                    }))
                };
            }).filter(pattern => pattern.count > 0);
            
            // Pattern 3: Time-based content
            const timePatterns = [];
            const timeRegex = /\b\d{1,2}:\d{2}\s*(am|pm|AM|PM)\b/g;
            const dateRegex = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi;
            
            document.querySelectorAll('*').forEach(el => {
                const text = el.textContent || '';
                if (timeRegex.test(text) || dateRegex.test(text)) {
                    timePatterns.push({
                        tagName: el.tagName,
                        className: el.className,
                        text: text.substring(0, 200),
                        hasTime: timeRegex.test(text),
                        hasDate: dateRegex.test(text)
                    });
                }
            });
            
            // Pattern 4: Structured data detection
            const structuredDataElements = [
                'script[type="application/ld+json"]',
                '[itemscope]',
                '[property*="event"]',
                '[typeof="Event"]'
            ];
            
            const structuredData = structuredDataElements.map(selector => ({
                selector,
                count: document.querySelectorAll(selector).length,
                content: Array.from(document.querySelectorAll(selector)).slice(0, 2).map(el => 
                    el.textContent?.substring(0, 200) || el.outerHTML.substring(0, 200)
                )
            }));
            
            return {
                layoutPatterns: layoutPatterns.slice(0, 10), // Limit for readability
                gridPatterns,
                timePatterns: timePatterns.slice(0, 10),
                structuredData,
                patternCounts: {
                    imageTextCombos: layoutPatterns.length,
                    timeElements: timePatterns.length,
                    structuredElements: structuredData.reduce((sum, pattern) => sum + pattern.count, 0)
                }
            };
        });
        
        this.analysis.eventStructure = eventStructure;
        console.log(chalk.green(`✅ Event structure analysis: ${eventStructure.patternCounts.imageTextCombos} image/text combos, ${eventStructure.patternCounts.timeElements} time elements`));
    }

    async analyzeRenderingBehavior() {
        console.log(chalk.yellow('⚡ Analyzing JavaScript rendering and dynamic content...'));
        
        // Take initial screenshot
        await this.page.screenshot({ path: '/Users/user/Desktop/hash/scripts/scraper/mad-oak-initial.png' });
        
        const renderingAnalysis = await this.page.evaluate(() => {
            // Check for framework indicators
            const frameworks = {
                react: !!(window.React || document.querySelector('[data-reactroot], [data-react-helmet]') || 
                         Array.from(document.querySelectorAll('script')).some(s => s.src.includes('react'))),
                vue: !!(window.Vue || document.querySelector('[data-server-rendered="true"]') ||
                        Array.from(document.querySelectorAll('script')).some(s => s.src.includes('vue'))),
                angular: !!(window.ng || document.querySelector('[ng-app], [data-ng-app]') ||
                           Array.from(document.querySelectorAll('script')).some(s => s.src.includes('angular'))),
                jquery: !!(window.jQuery || window.$),
                wordpress: !!(document.querySelector('meta[name="generator"][content*="WordPress"]') ||
                             document.querySelector('link[href*="wp-content"]'))
            };
            
            // Analyze scripts
            const scripts = Array.from(document.querySelectorAll('script'));
            const scriptAnalysis = {
                total: scripts.length,
                external: scripts.filter(s => s.src).length,
                inline: scripts.filter(s => !s.src && s.textContent).length,
                async: scripts.filter(s => s.async).length,
                defer: scripts.filter(s => s.defer).length,
                types: [...new Set(scripts.map(s => s.type || 'text/javascript'))]
            };
            
            // Check for lazy loading
            const lazyElements = {
                images: document.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy]').length,
                iframes: document.querySelectorAll('iframe[loading="lazy"], iframe[data-src]').length,
                other: document.querySelectorAll('[data-lazy], [data-src]:not(img):not(iframe)').length
            };
            
            // Check for AJAX indicators
            const ajaxIndicators = {
                fetchCalls: window.fetch !== undefined,
                xhrOverride: window.XMLHttpRequest !== undefined,
                jqueryAjax: window.jQuery && typeof window.jQuery.ajax === 'function',
                hasSpinners: document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="loader"]').length
            };
            
            return {
                frameworks,
                scriptAnalysis,
                lazyElements,
                ajaxIndicators,
                documentReadyState: document.readyState,
                hasServiceWorker: 'serviceWorker' in navigator
            };
        });
        
        // Wait for any additional dynamic content and compare
        await this.page.waitForTimeout(3000);
        await this.page.screenshot({ path: '/Users/user/Desktop/hash/scripts/scraper/mad-oak-after-wait.png' });
        
        // Check if content changed
        const contentAfterWait = await this.page.evaluate(() => document.body.innerHTML.length);
        const initialContentLength = await this.page.evaluate(() => document.body.innerHTML.length);
        
        renderingAnalysis.contentChanged = contentAfterWait !== initialContentLength;
        renderingAnalysis.dynamicContentIndicator = renderingAnalysis.contentChanged;
        
        this.analysis.renderingAnalysis = renderingAnalysis;
        console.log(chalk.green(`✅ Rendering analysis complete. Dynamic content: ${renderingAnalysis.contentChanged ? 'YES' : 'NO'}`));
    }

    async analyzeCssAndStyling() {
        console.log(chalk.yellow('🎨 Analyzing CSS and styling patterns...'));
        
        const cssAnalysis = await this.page.evaluate(() => {
            const stylesheets = Array.from(document.styleSheets);
            const computedStyles = new Map();
            
            // Analyze visibility and positioning
            const hiddenElements = [];
            const offscreenElements = [];
            const overlappingElements = [];
            
            document.querySelectorAll('*').forEach((el, index) => {
                if (index > 1000) return; // Limit for performance
                
                const styles = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                
                // Check for hidden content
                if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
                    hiddenElements.push({
                        tagName: el.tagName,
                        className: el.className,
                        reason: styles.display === 'none' ? 'display: none' : 
                               styles.visibility === 'hidden' ? 'visibility: hidden' : 'opacity: 0'
                    });
                }
                
                // Check for off-screen content
                if (rect.left < -100 || rect.top < -100 || rect.left > window.innerWidth + 100) {
                    offscreenElements.push({
                        tagName: el.tagName,
                        className: el.className,
                        position: { x: rect.left, y: rect.top }
                    });
                }
                
                // Store interesting styles
                if (el.className && (el.className.includes('event') || el.className.includes('happening'))) {
                    computedStyles.set(el.className, {
                        display: styles.display,
                        position: styles.position,
                        float: styles.float,
                        flexDirection: styles.flexDirection,
                        gridTemplateColumns: styles.gridTemplateColumns
                    });
                }
            });
            
            // Analyze layout methods
            const layoutMethods = {
                flexbox: document.querySelectorAll('[style*="display: flex"], [style*="display:flex"]').length +
                        Array.from(document.querySelectorAll('*')).filter(el => 
                            window.getComputedStyle(el).display === 'flex').length,
                grid: document.querySelectorAll('[style*="display: grid"], [style*="display:grid"]').length +
                     Array.from(document.querySelectorAll('*')).filter(el => 
                         window.getComputedStyle(el).display === 'grid').length,
                float: Array.from(document.querySelectorAll('*')).filter(el => {
                    const float = window.getComputedStyle(el).float;
                    return float === 'left' || float === 'right';
                }).length,
                absolute: Array.from(document.querySelectorAll('*')).filter(el => 
                    window.getComputedStyle(el).position === 'absolute').length
            };
            
            return {
                stylesheetCount: stylesheets.length,
                hiddenElements: hiddenElements.slice(0, 20),
                offscreenElements: offscreenElements.slice(0, 10),
                layoutMethods,
                eventElementStyles: Object.fromEntries(computedStyles),
                suspiciousPatterns: {
                    manyHiddenElements: hiddenElements.length > 50,
                    manyOffscreenElements: offscreenElements.length > 20,
                    complexPositioning: layoutMethods.absolute > 20
                }
            };
        });
        
        this.analysis.cssAnalysis = cssAnalysis;
        console.log(chalk.green(`✅ CSS analysis complete: ${cssAnalysis.hiddenElements.length} hidden elements, ${cssAnalysis.offscreenElements.length} off-screen`));
    }

    generateRecommendations() {
        console.log(chalk.yellow('💡 Generating extraction recommendations...'));
        
        const recommendations = [];
        
        // Analyze results and generate recommendations
        if (this.analysis.imageAnalysis.eventImages.length > 0) {
            recommendations.push({
                type: 'ocr_required',
                priority: 'high',
                description: `${this.analysis.imageAnalysis.eventImages.length} event-related images detected - OCR extraction recommended`,
                implementation: 'Set ocrTriggerThreshold to 80% or lower'
            });
        }
        
        if (this.analysis.renderingAnalysis.frameworks.react || this.analysis.renderingAnalysis.frameworks.vue) {
            recommendations.push({
                type: 'dynamic_content',
                priority: 'high', 
                description: 'SPA framework detected - increase wait times for content loading',
                implementation: 'Add waitForTimeout(5000) after page load'
            });
        }
        
        if (this.analysis.cssAnalysis.hiddenElements.length > 20) {
            recommendations.push({
                type: 'hidden_content',
                priority: 'medium',
                description: `${this.analysis.cssAnalysis.hiddenElements.length} hidden elements found - some content may be in collapsed sections`,
                implementation: 'Check for accordion/tab content that needs to be expanded'
            });
        }
        
        if (this.analysis.eventStructure.patternCounts.imageTextCombos > 3) {
            recommendations.push({
                type: 'layout_pattern',
                priority: 'medium',
                description: 'Image/text combination layout detected - consider dual extraction strategy',
                implementation: 'Extract text from HTML AND run OCR on associated images'
            });
        }
        
        if (this.analysis.textAnalysis.eventKeywordDensity < 5) {
            recommendations.push({
                type: 'low_keyword_density',
                priority: 'high',
                description: 'Low event keyword density suggests text is primarily in images',
                implementation: 'Enable OCR with aggressive image selection'
            });
        }
        
        this.analysis.recommendations = recommendations;
        
        // Print recommendations
        console.log(chalk.blue('\n💡 Extraction Recommendations:'));
        recommendations.forEach((rec, index) => {
            const priority = rec.priority === 'high' ? chalk.red('HIGH') : 
                            rec.priority === 'medium' ? chalk.yellow('MEDIUM') : 
                            chalk.green('LOW');
            console.log(chalk.blue(`${index + 1}. [${priority}] ${rec.type}: ${rec.description}`));
            console.log(chalk.gray(`   → ${rec.implementation}`));
        });
    }

    async saveAnalysis() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `/Users/user/Desktop/hash/scripts/scraper/mad-oak-structure-analysis-${timestamp}.json`;
        
        try {
            await fs.writeFile(filename, JSON.stringify(this.analysis, null, 2));
            console.log(chalk.green(`💾 Analysis saved to: ${filename}`));
            
            // Generate summary report
            const summaryReport = this.generateSummaryReport();
            const summaryFilename = `/Users/user/Desktop/hash/scripts/scraper/mad-oak-structure-summary-${timestamp}.md`;
            await fs.writeFile(summaryFilename, summaryReport);
            console.log(chalk.green(`📄 Summary report: ${summaryFilename}`));
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to save analysis:'), error.message);
        }
    }

    generateSummaryReport() {
        return `# Mad Oak Bar Structure Analysis Report

## Executive Summary
Analysis of ${this.analysis.url} conducted on ${this.analysis.timestamp}

## Key Findings

### Content Distribution
- **Total Text**: ${this.analysis.textAnalysis.totalTextLength} characters
- **Images**: ${this.analysis.imageAnalysis.totalImages} total (${this.analysis.imageAnalysis.eventImages.length} event-related)
- **Event Keywords**: ${this.analysis.textAnalysis.eventKeywordDensity} instances
- **Text Density**: ${(this.analysis.textAnalysis.totalTextLength / this.analysis.imageAnalysis.totalImages).toFixed(2)} chars per image

### Technical Architecture
- **Framework**: ${Object.entries(this.analysis.renderingAnalysis.frameworks)
    .filter(([name, detected]) => detected)
    .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1))
    .join(', ') || 'Vanilla HTML/JS'}
- **Scripts**: ${this.analysis.renderingAnalysis.scriptAnalysis.total} (${this.analysis.renderingAnalysis.scriptAnalysis.external} external)
- **Dynamic Content**: ${this.analysis.renderingAnalysis.contentChanged ? 'Yes - content loads dynamically' : 'No - static content'}

### Layout Patterns
- **Image/Text Combinations**: ${this.analysis.eventStructure.patternCounts.imageTextCombos}
- **Time Elements**: ${this.analysis.eventStructure.patternCounts.timeElements}
- **Hidden Elements**: ${this.analysis.cssAnalysis.hiddenElements.length}
- **Layout Method**: ${Object.entries(this.analysis.cssAnalysis.layoutMethods)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown'}

### Event Structure Analysis
${this.analysis.eventStructure.layoutPatterns.length > 0 ? 
`**Detected Layout Pattern**: Side-by-side image and text layout
- ${this.analysis.eventStructure.layoutPatterns.length} containers with images and substantial text
- Average text length: ${Math.round(this.analysis.eventStructure.layoutPatterns.reduce((sum, p) => sum + p.textLength, 0) / this.analysis.eventStructure.layoutPatterns.length)} characters` :
'**No clear event layout patterns detected**'}

## Why Traditional Extraction Struggles

${this.analysis.recommendations.map(rec => `### ${rec.type.replace(/_/g, ' ').toUpperCase()}
**Priority**: ${rec.priority.toUpperCase()}
**Issue**: ${rec.description}
**Solution**: ${rec.implementation}
`).join('\n')}

## Recommendations

### Immediate Actions
${this.analysis.recommendations.filter(r => r.priority === 'high').map(r => `- ${r.implementation}`).join('\n')}

### Secondary Optimizations  
${this.analysis.recommendations.filter(r => r.priority === 'medium').map(r => `- ${r.implementation}`).join('\n')}

### Configuration Suggestions
\`\`\`javascript
const extractorConfig = {
    ocrTriggerThreshold: ${this.analysis.imageAnalysis.eventImages.length > 2 ? '75' : '85'}, // Force OCR for this site
    waitTime: ${this.analysis.renderingAnalysis.contentChanged ? '5000' : '2000'}, // Dynamic content detected
    maxFlyerImages: ${Math.min(this.analysis.imageAnalysis.eventImages.length, 5)},
    enableAllLayers: true,
    imageMinSize: 200 // Focus on larger images likely to be flyers
};
\`\`\`

## Next Steps
1. Run OCR force test with recommended configuration
2. Compare extraction results before and after OCR
3. Fine-tune image selection criteria
4. Test performance impact of OCR integration

---
*Generated by Mad Oak Bar Structure Analyzer*
`;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            console.log(chalk.blue.bold('\n🔬 MAD OAK BAR STRUCTURE ANALYSIS'));
            console.log(chalk.blue('===================================\n'));
            
            await this.init();
            await this.loadAndAnalyzePage();
            await this.analyzeDomStructure();
            await this.analyzeTextDistribution();
            await this.analyzeImages();
            await this.analyzeEventStructure();
            await this.analyzeRenderingBehavior();
            await this.analyzeCssAndStyling();
            
            this.generateRecommendations();
            await this.saveAnalysis();
            
            console.log(chalk.green.bold('\n✅ Structure Analysis Complete!'));
            console.log(chalk.blue('Use the recommendations to configure the OCR force test.'));
            
        } catch (error) {
            console.error(chalk.red.bold('\n❌ Analysis Failed:'), error.message);
            console.error(error.stack);
        } finally {
            await this.cleanup();
        }
    }
}

// Run the analyzer
if (require.main === module) {
    const analyzer = new MadOakStructureAnalyzer();
    analyzer.run().catch(console.error);
}

module.exports = MadOakStructureAnalyzer;