#!/usr/bin/env node

/**
 * OCR Test Fixtures Generator
 * 
 * Creates sample flyer images for OCR testing with known text content.
 * Generates various flyer types with different quality levels and challenges.
 * 
 * @version 1.0.0
 * @author Claude Code - Test Fixture Specialist
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class OCRTestFixtureGenerator {
    constructor(outputDir) {
        this.outputDir = outputDir || path.join(__dirname, 'images');
        this.generatedFixtures = [];
    }
    
    /**
     * Generate all test fixtures
     */
    async generateAllFixtures() {
        console.log(chalk.blue('🇫  Generating OCR Test Fixtures...'));
        
        try {
            // Ensure output directory exists
            await fs.mkdir(this.outputDir, { recursive: true });
            
            // Generate high quality samples
            console.log(chalk.cyan('   Generating high quality samples...'));
            await this.generateHighQualityFixtures();
            
            // Generate medium quality samples
            console.log(chalk.cyan('   Generating medium quality samples...'));
            await this.generateMediumQualityFixtures();
            
            // Generate challenging samples
            console.log(chalk.cyan('   Generating challenging samples...'));
            await this.generateChallengingFixtures();
            
            // Generate edge case samples
            console.log(chalk.cyan('   Generating edge case samples...'));
            await this.generateEdgeCaseFixtures();
            
            // Generate ground truth data
            console.log(chalk.cyan('   Generating ground truth data...'));
            await this.generateGroundTruthData();
            
            console.log(chalk.green(`✅ Generated ${this.generatedFixtures.length} test fixtures`));
            
            return this.generatedFixtures;
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to generate fixtures: ${error.message}`));
            throw error;
        }
    }
    
    /**
     * Generate high quality flyer samples
     */
    async generateHighQualityFixtures() {
        const fixtures = [
            {
                name: 'concert_high_quality.jpg',
                type: 'concert',
                quality: 'high',
                content: {
                    title: 'LIVE MUSIC NIGHT',
                    artist: 'The Electric Band',
                    venue: 'Blue Note Jazz Club',
                    address: '131 W 3rd St, New York, NY 10012',
                    date: 'December 15, 2024',
                    time: '8:00 PM',
                    price: '$25 Advance / $30 Door',
                    age: '21+',
                    website: 'www.bluenotejazz.com'
                }
            },
            {
                name: 'nightlife_high_quality.png',
                type: 'nightlife',
                quality: 'high',
                content: {
                    eventName: 'SATURDAY NIGHT PARTY',
                    dj: 'DJ PULSE',
                    venue: 'Club Revolution',
                    address: '456 Dance Ave, Miami, FL 33139',
                    date: 'December 21, 2024',
                    time: '10:00 PM - 3:00 AM',
                    age: '21+ ONLY',
                    dresscode: 'Upscale Casual',
                    price: 'FREE before 11PM'
                }
            },
            {
                name: 'comedy_high_quality.jpg',
                type: 'comedy',
                quality: 'high',
                content: {
                    showTitle: 'COMEDY NIGHT LIVE',
                    comedian: 'Mike Johnson',
                    venue: 'Laugh Track Comedy Club',
                    address: '789 Funny St, Los Angeles, CA 90210',
                    date: 'December 30, 2024',
                    showTimes: '7:00 PM & 9:30 PM',
                    price: '$25 + 2 Drink Minimum',
                    phone: '(555) 123-JOKE'
                }
            },
            {
                name: 'sports_high_quality.png',
                type: 'sports',
                quality: 'high',
                content: {
                    eventTitle: 'CHAMPIONSHIP GAME',
                    teams: 'Warriors vs Lakers',
                    venue: 'Sports Arena',
                    address: '1000 Stadium Way, San Francisco, CA 94124',
                    date: 'January 5, 2025',
                    gameTime: '3:00 PM',
                    ticketPrice: 'Starting at $45',
                    season: 'Regular Season'
                }
            },
            {
                name: 'food_high_quality.jpg',
                type: 'food',
                quality: 'high',
                content: {
                    eventName: 'ITALIAN FOOD FESTIVAL',
                    cuisine: 'Authentic Italian',
                    chef: 'Chef Marco Romano',
                    venue: 'Bella Vista Restaurant',
                    address: '555 Little Italy St, Boston, MA 02113',
                    date: 'January 10, 2025',
                    time: '6:00 PM - 10:00 PM',
                    price: '$75 per person',
                    reservations: '(617) 555-FOOD'
                }
            }
        ];
        
        for (const fixture of fixtures) {
            const imagePath = path.join(this.outputDir, fixture.name);
            await this.createFlyerImage(fixture, imagePath);
            this.generatedFixtures.push(fixture);
        }
    }
    
    /**
     * Generate medium quality flyer samples
     */
    async generateMediumQualityFixtures() {
        const fixtures = [
            {
                name: 'concert_medium_quality.jpg',
                type: 'concert',
                quality: 'medium',
                challenges: ['smaller_text', 'background_noise'],
                content: {
                    title: 'Rock Show Tonight',
                    artist: 'Local Band',
                    venue: 'Downtown Venue',
                    date: 'Dec 20 2024',
                    time: '9 PM',
                    price: '$15'
                }
            },
            {
                name: 'nightlife_medium_quality.png',
                type: 'nightlife',
                quality: 'medium',
                challenges: ['stylized_fonts', 'color_contrast'],
                content: {
                    eventName: 'Friday Night',
                    dj: 'DJ Mix',
                    venue: 'Night Club',
                    date: 'Every Friday',
                    time: '10 PM',
                    age: '21+'
                }
            }
        ];
        
        for (const fixture of fixtures) {
            const imagePath = path.join(this.outputDir, fixture.name);
            await this.createFlyerImage(fixture, imagePath);
            this.generatedFixtures.push(fixture);
        }
    }
    
    /**
     * Generate challenging flyer samples
     */
    async generateChallengingFixtures() {
        const fixtures = [
            {
                name: 'stylized_fonts.jpg',
                type: 'concert',
                quality: 'challenging',
                challenges: ['decorative_fonts', 'curved_text', 'overlapping_elements'],
                content: {
                    title: 'METAL MAYHEM',
                    artist: 'Death Scream',
                    venue: 'Underground',
                    date: 'Halloween 2024'
                }
            },
            {
                name: 'low_resolution.png',
                type: 'nightlife',
                quality: 'challenging',
                challenges: ['pixelation', 'compression_artifacts'],
                content: {
                    eventName: 'Rave Night',
                    venue: 'Warehouse',
                    time: 'Late Night'
                }
            },
            {
                name: 'poor_contrast.jpg',
                type: 'food',
                quality: 'challenging',
                challenges: ['low_contrast', 'similar_colors'],
                content: {
                    eventName: 'Wine Tasting',
                    venue: 'Winery',
                    date: 'Weekend'
                }
            },
            {
                name: 'rotated_text.jpg',
                type: 'comedy',
                quality: 'challenging',
                challenges: ['rotated_text', 'angled_layout'],
                content: {
                    showTitle: 'Stand Up Show',
                    comedian: 'Funny Person',
                    venue: 'Comedy Club'
                }
            },
            {
                name: 'multiple_languages.png',
                type: 'food',
                quality: 'challenging',
                challenges: ['mixed_languages', 'special_characters'],
                content: {
                    eventName: 'Café & Tacos',
                    venue: 'Restaurante Español',
                    date: 'Mañana 7:00 PM'
                }
            },
            {
                name: 'handwritten_text.jpg',
                type: 'concert',
                quality: 'challenging',
                challenges: ['handwriting', 'irregular_spacing'],
                content: {
                    title: 'Acoustic Set',
                    artist: 'Local Artist',
                    venue: 'Coffee Shop'
                }
            }
        ];
        
        for (const fixture of fixtures) {
            const imagePath = path.join(this.outputDir, fixture.name);
            await this.createChallengingImage(fixture, imagePath);
            this.generatedFixtures.push(fixture);
        }
    }
    
    /**
     * Generate edge case samples
     */
    async generateEdgeCaseFixtures() {
        const fixtures = [
            {
                name: 'no_text_image.jpg',
                type: 'edge_case',
                quality: 'edge_case',
                content: {},
                description: 'Image with no text content'
            },
            {
                name: 'very_large.png',
                type: 'edge_case',
                quality: 'edge_case',
                content: {
                    title: 'Large Image Test'
                },
                dimensions: { width: 4000, height: 3000 },
                description: 'Very large image to test memory handling'
            },
            {
                name: 'tiny_text.jpg',
                type: 'edge_case',
                quality: 'edge_case',
                content: {
                    title: 'Tiny Text'
                },
                fontSize: 8,
                description: 'Image with extremely small text'
            }
        ];
        
        for (const fixture of fixtures) {
            const imagePath = path.join(this.outputDir, fixture.name);
            await this.createEdgeCaseImage(fixture, imagePath);
            this.generatedFixtures.push(fixture);
        }
    }
    
    /**
     * Create a flyer image with specified content
     */
    async createFlyerImage(fixture, imagePath) {
        const width = 600;
        const height = 800;
        
        // Create SVG content
        let svgContent = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <!-- Background -->
            <rect width="100%" height="100%" fill="#ffffff" stroke="#000000" stroke-width="2"/>
            
            <!-- Border decoration -->
            <rect x="20" y="20" width="${width-40}" height="${height-40}" fill="none" stroke="#333333" stroke-width="1"/>
        `;
        
        let y = 80;
        const lineHeight = fixture.quality === 'high' ? 45 : 35;
        const fontSize = fixture.quality === 'high' ? '32' : '24';
        
        // Add title with larger font
        const title = fixture.content.title || fixture.content.eventName || fixture.content.showTitle || 'EVENT';
        if (title) {
            svgContent += `<text x="${width/2}" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${parseInt(fontSize) + 8}" font-weight="bold" fill="#000000">${this.escapeXml(title)}</text>`;
            y += lineHeight + 10;
        }
        
        // Add other content
        const contentOrder = ['artist', 'comedian', 'dj', 'chef', 'teams', 'venue', 'address', 'date', 'time', 'gameTime', 'showTimes', 'price', 'ticketPrice', 'age', 'phone', 'website', 'reservations'];
        
        for (const key of contentOrder) {
            if (fixture.content[key] && y < height - 100) {
                const value = fixture.content[key];
                const label = this.formatLabel(key);
                
                // Add label
                svgContent += `<text x="50" y="${y}" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#666666">${label}:</text>`;
                y += 25;
                
                // Add value
                svgContent += `<text x="50" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#000000">${this.escapeXml(value)}</text>`;
                y += lineHeight;
            }
        }
        
        svgContent += '</svg>';
        
        // Convert SVG to image
        const svgBuffer = Buffer.from(svgContent);
        
        const imageFormat = path.extname(imagePath).toLowerCase();
        let sharpInstance = sharp(svgBuffer);
        
        // Apply quality adjustments
        if (fixture.quality === 'medium') {
            sharpInstance = sharpInstance.resize(400, 533); // Reduce resolution
        } else if (fixture.quality === 'high') {
            sharpInstance = sharpInstance.resize(800, 1067); // High resolution
        }
        
        // Set format and quality
        if (imageFormat === '.jpg' || imageFormat === '.jpeg') {
            const quality = fixture.quality === 'high' ? 95 : fixture.quality === 'medium' ? 75 : 60;
            sharpInstance = sharpInstance.jpeg({ quality });
        } else {
            sharpInstance = sharpInstance.png({ compressionLevel: fixture.quality === 'high' ? 3 : 6 });
        }
        
        await sharpInstance.toFile(imagePath);
        console.log(chalk.gray(`   Created: ${fixture.name}`));
    }
    
    /**
     * Create challenging images with specific difficulties
     */
    async createChallengingImage(fixture, imagePath) {
        const width = 600;
        const height = 800;
        
        let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        // Apply challenges based on fixture settings
        if (fixture.challenges.includes('poor_contrast')) {
            svgContent += `<rect width="100%" height="100%" fill="#f0f0f0"/>`;
        } else if (fixture.challenges.includes('background_noise')) {
            svgContent += `<rect width="100%" height="100%" fill="#ffffff"/>`;
            // Add noise pattern
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                svgContent += `<circle cx="${x}" cy="${y}" r="2" fill="#eeeeee"/>`;
            }
        } else {
            svgContent += `<rect width="100%" height="100%" fill="#ffffff"/>`;
        }
        
        let y = 100;
        
        // Add content with challenges
        for (const [key, value] of Object.entries(fixture.content)) {
            let textElement = `<text x="50" y="${y}" font-family="Arial, sans-serif"`;
            
            // Apply text challenges
            if (fixture.challenges.includes('stylized_fonts')) {
                textElement += ` font-family="Impact, Arial Black, sans-serif"`;
            }
            
            if (fixture.challenges.includes('curved_text')) {
                // Simulate curved text with slight rotation
                const rotation = (Math.random() - 0.5) * 10; // -5 to +5 degrees
                textElement += ` transform="rotate(${rotation} 50 ${y})"`;
            }
            
            if (fixture.challenges.includes('poor_contrast')) {
                textElement += ` fill="#cccccc"`; // Light gray on light background
            } else {
                textElement += ` fill="#000000"`;
            }
            
            textElement += ` font-size="24">${this.escapeXml(value)}</text>`;
            svgContent += textElement;
            
            y += 50;
        }
        
        svgContent += '</svg>';
        
        // Convert and apply additional challenges
        const svgBuffer = Buffer.from(svgContent);
        let sharpInstance = sharp(svgBuffer);
        
        if (fixture.challenges.includes('low_resolution')) {
            sharpInstance = sharpInstance.resize(200, 267); // Very low resolution
        }
        
        if (fixture.challenges.includes('compression_artifacts')) {
            sharpInstance = sharpInstance.jpeg({ quality: 30 }); // Heavy compression
        } else {
            const format = path.extname(imagePath).toLowerCase();
            if (format === '.jpg' || format === '.jpeg') {
                sharpInstance = sharpInstance.jpeg({ quality: 70 });
            } else {
                sharpInstance = sharpInstance.png();
            }
        }
        
        await sharpInstance.toFile(imagePath);
        console.log(chalk.gray(`   Created challenging: ${fixture.name}`));
    }
    
    /**
     * Create edge case images
     */
    async createEdgeCaseImage(fixture, imagePath) {
        const width = fixture.dimensions?.width || 600;
        const height = fixture.dimensions?.height || 800;
        
        let sharpInstance;
        
        switch (fixture.name) {
            case 'no_text_image.jpg':
                // Create image with no text, just patterns
                sharpInstance = sharp({
                    create: {
                        width: width,
                        height: height,
                        channels: 3,
                        background: { r: 200, g: 150, b: 100 }
                    }
                });
                break;
                
            case 'very_large.png':
                // Create very large image
                const largeSvg = `
                <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="white"/>
                    <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="72" fill="black">${this.escapeXml(fixture.content.title || 'LARGE IMAGE TEST')}</text>
                </svg>`;
                sharpInstance = sharp(Buffer.from(largeSvg));
                break;
                
            case 'tiny_text.jpg':
                // Create image with extremely small text
                const tinyTextSvg = `
                <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="white"/>
                    <text x="50" y="50" font-family="Arial" font-size="${fixture.fontSize || 8}" fill="black">${this.escapeXml(fixture.content.title || 'Tiny Text')}</text>
                </svg>`;
                sharpInstance = sharp(Buffer.from(tinyTextSvg));
                break;
                
            default:
                // Default edge case
                sharpInstance = sharp({
                    create: {
                        width: width,
                        height: height,
                        channels: 3,
                        background: { r: 255, g: 255, b: 255 }
                    }
                });
        }
        
        const format = path.extname(imagePath).toLowerCase();
        if (format === '.jpg' || format === '.jpeg') {
            sharpInstance = sharpInstance.jpeg({ quality: 85 });
        } else {
            sharpInstance = sharpInstance.png();
        }
        
        await sharpInstance.toFile(imagePath);
        console.log(chalk.gray(`   Created edge case: ${fixture.name}`));
    }
    
    /**
     * Generate ground truth data file
     */
    async generateGroundTruthData() {
        const groundTruth = {};
        
        for (const fixture of this.generatedFixtures) {
            groundTruth[fixture.name] = {
                type: fixture.type,
                quality: fixture.quality,
                challenges: fixture.challenges || [],
                description: fixture.description || `${fixture.type} flyer with ${fixture.quality} quality`,
                ...fixture.content,
                expectedAccuracy: this.calculateExpectedAccuracy(fixture)
            };
        }
        
        const groundTruthPath = path.join(this.outputDir, 'ground_truth.json');
        await fs.writeFile(groundTruthPath, JSON.stringify(groundTruth, null, 2));
        
        console.log(chalk.green(`   Created ground truth data: ${groundTruthPath}`));
    }
    
    /**
     * Calculate expected accuracy for a fixture
     */
    calculateExpectedAccuracy(fixture) {
        let baseAccuracy = 90;
        
        // Adjust based on quality
        switch (fixture.quality) {
            case 'high':
                baseAccuracy = 95;
                break;
            case 'medium':
                baseAccuracy = 85;
                break;
            case 'challenging':
                baseAccuracy = 70;
                break;
            case 'edge_case':
                baseAccuracy = 50;
                break;
        }
        
        // Adjust based on challenges
        if (fixture.challenges) {
            const challengePenalties = {
                'stylized_fonts': -10,
                'poor_contrast': -15,
                'low_resolution': -20,
                'curved_text': -15,
                'handwriting': -25,
                'rotated_text': -20,
                'multiple_languages': -10,
                'compression_artifacts': -15
            };
            
            for (const challenge of fixture.challenges) {
                baseAccuracy += challengePenalties[challenge] || -5;
            }
        }
        
        return Math.max(20, Math.min(98, baseAccuracy));
    }
    
    /**
     * Format field labels for display
     */
    formatLabel(key) {
        const labelMap = {
            'eventName': 'Event',
            'showTitle': 'Show',
            'gameTime': 'Game Time',
            'showTimes': 'Show Times',
            'ticketPrice': 'Tickets',
            'dresscode': 'Dress Code'
        };
        
        return labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
    }
    
    /**
     * Escape XML characters
     */
    escapeXml(text) {
        if (typeof text !== 'string') return text;
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

// CLI usage
if (require.main === module) {
    const outputDir = process.argv[2] || path.join(__dirname, 'images');
    const generator = new OCRTestFixtureGenerator(outputDir);
    
    generator.generateAllFixtures()
        .then(fixtures => {
            console.log(chalk.green(`\n✅ Successfully generated ${fixtures.length} test fixtures`));
            console.log(chalk.cyan(`Output directory: ${outputDir}`));
        })
        .catch(error => {
            console.error(chalk.red(`\n❌ Failed to generate fixtures: ${error.message}`));
            process.exit(1);
        });
}

module.exports = OCRTestFixtureGenerator;
