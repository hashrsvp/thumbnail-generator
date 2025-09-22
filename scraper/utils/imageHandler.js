#!/usr/bin/env node

/**
 * Image Handler for Hash Event Scraper
 * 
 * Downloads, processes, and uploads event images to Firebase Storage
 * following Hash app conventions.
 */

const axios = require('axios');
const sharp = require('sharp');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class ImageHandler {
    constructor() {
        this.storage = null;
        this.tempDir = path.join(__dirname, '..', '..', 'temp_images');
        
        // Ensure temp directory exists
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
        
        // Hash app image requirements
        this.MAX_FILE_SIZE = 1024 * 1024; // 1MB as required by Hash form
        this.SUPPORTED_FORMATS = ['jpeg', 'jpg', 'png', 'webp'];
        this.OUTPUT_FORMAT = 'png'; // Hash app uses PNG
        this.IMAGE_QUALITY = 90;
        this.MAX_DIMENSION = 1920; // Reasonable max size
    }
    
    /**
     * Initialize Firebase Storage
     */
    initStorage() {
        if (!this.storage && admin.apps.length > 0) {
            this.storage = admin.storage();
        }
        return this.storage !== null;
    }
    
    /**
     * Download image from URL
     */
    async downloadImage(imageUrl, eventId) {
        if (!imageUrl || typeof imageUrl !== 'string') {
            throw new Error('Invalid image URL');
        }
        
        try {
            console.log(chalk.cyan(`📥 Downloading image: ${imageUrl}`));
            
            const response = await axios({
                method: 'GET',
                url: imageUrl,
                responseType: 'arraybuffer',
                timeout: 30000, // 30 second timeout
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            
            const buffer = Buffer.from(response.data);
            const tempPath = path.join(this.tempDir, `${eventId}_original`);
            
            fs.writeFileSync(tempPath, buffer);
            console.log(chalk.green(`✅ Image downloaded: ${buffer.length} bytes`));
            
            return {
                path: tempPath,
                size: buffer.length,
                buffer: buffer
            };
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to download image: ${error.message}`));
            throw new Error(`Image download failed: ${error.message}`);
        }
    }
    
    /**
     * Process and optimize image for Hash app requirements
     */
    async processImage(imagePath, eventId) {
        try {
            console.log(chalk.cyan(`🔄 Processing image for event: ${eventId}`));
            
            const metadata = await sharp(imagePath).metadata();
            console.log(chalk.gray(`   Original: ${metadata.width}x${metadata.height}, ${metadata.format}, ${Math.round(metadata.size / 1024)}KB`));
            
            let sharpInstance = sharp(imagePath);
            
            // Resize if too large
            if (metadata.width > this.MAX_DIMENSION || metadata.height > this.MAX_DIMENSION) {
                sharpInstance = sharpInstance.resize(this.MAX_DIMENSION, this.MAX_DIMENSION, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
                console.log(chalk.yellow(`📏 Resizing to fit ${this.MAX_DIMENSION}x${this.MAX_DIMENSION}`));
            }
            
            // Convert to PNG and optimize
            sharpInstance = sharpInstance
                .png({ 
                    quality: this.IMAGE_QUALITY,
                    compressionLevel: 9,
                    adaptiveFiltering: true
                });
            
            const outputPath = path.join(this.tempDir, `${eventId}_processed.png`);
            await sharpInstance.toFile(outputPath);
            
            const processedStats = fs.statSync(outputPath);
            console.log(chalk.green(`✅ Processed: ${Math.round(processedStats.size / 1024)}KB`));
            
            // If still too large, reduce quality
            if (processedStats.size > this.MAX_FILE_SIZE) {
                console.log(chalk.yellow(`⚠️  File still too large, reducing quality...`));
                
                let quality = this.IMAGE_QUALITY;
                let attempts = 0;
                
                while (processedStats.size > this.MAX_FILE_SIZE && quality > 20 && attempts < 5) {
                    quality -= 15;
                    attempts++;
                    
                    await sharp(imagePath)
                        .resize(this.MAX_DIMENSION, this.MAX_DIMENSION, {
                            fit: 'inside',
                            withoutEnlargement: true
                        })
                        .png({ quality: quality })
                        .toFile(outputPath);
                        
                    const newStats = fs.statSync(outputPath);
                    console.log(chalk.gray(`   Attempt ${attempts}: Quality ${quality}%, Size ${Math.round(newStats.size / 1024)}KB`));
                    
                    if (newStats.size <= this.MAX_FILE_SIZE) {
                        break;
                    }
                }
                
                const finalStats = fs.statSync(outputPath);
                if (finalStats.size > this.MAX_FILE_SIZE) {
                    console.warn(chalk.yellow(`⚠️  Warning: Final image size (${Math.round(finalStats.size / 1024)}KB) exceeds 1MB limit`));
                }
            }
            
            return {
                path: outputPath,
                size: fs.statSync(outputPath).size
            };
            
        } catch (error) {
            console.error(chalk.red(`❌ Image processing failed: ${error.message}`));
            throw new Error(`Image processing failed: ${error.message}`);
        }
    }
    
    /**
     * Create thumbnail version of the image
     */
    async createThumbnail(imagePath, eventId) {
        try {
            console.log(chalk.cyan(`📐 Creating thumbnail for event: ${eventId}`));
            
            const thumbnailPath = path.join(this.tempDir, `${eventId}_thumbnail.png`);
            
            // Create thumbnail (300x300 max, maintaining aspect ratio)
            await sharp(imagePath)
                .resize(300, 300, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .png({ 
                    quality: 85,
                    compressionLevel: 9
                })
                .toFile(thumbnailPath);
                
            const thumbnailStats = fs.statSync(thumbnailPath);
            console.log(chalk.green(`✅ Thumbnail created: ${Math.round(thumbnailStats.size / 1024)}KB`));
            
            return {
                path: thumbnailPath,
                size: thumbnailStats.size
            };
            
        } catch (error) {
            console.error(chalk.red(`❌ Thumbnail creation failed: ${error.message}`));
            throw new Error(`Thumbnail creation failed: ${error.message}`);
        }
    }

    /**
     * Upload both event_image and event_thumbnail to Firebase Storage
     */
    async uploadToFirebase(imagePath, eventId) {
        if (!this.initStorage()) {
            throw new Error('Firebase Storage not initialized');
        }
        
        try {
            console.log(chalk.cyan(`☁️  Uploading to Firebase Storage...`));
            
            const bucket = this.storage.bucket();
            
            // Create thumbnail
            const thumbnail = await this.createThumbnail(imagePath, eventId);
            
            // Upload main event image with proper extension
            const imageFileName = `events/${eventId}/event_image.png`;
            const imageFile = bucket.file(imageFileName);
            
            await imageFile.save(fs.readFileSync(imagePath), {
                metadata: {
                    contentType: 'image/png',
                    metadata: {
                        uploadedBy: 'event_scraper',
                        uploadedAt: new Date().toISOString(),
                        eventId: eventId,
                        imageType: 'main'
                    }
                }
            });
            
            // Upload thumbnail with proper extension
            const thumbnailFileName = `events/${eventId}/event_thumbnail.png`;
            const thumbnailFile = bucket.file(thumbnailFileName);
            
            await thumbnailFile.save(fs.readFileSync(thumbnail.path), {
                metadata: {
                    contentType: 'image/png',
                    metadata: {
                        uploadedBy: 'event_scraper',
                        uploadedAt: new Date().toISOString(),
                        eventId: eventId,
                        imageType: 'thumbnail'
                    }
                }
            });
            
            // Make files publicly accessible (if needed by Hash app)
            await imageFile.makePublic();
            await thumbnailFile.makePublic();
            
            const imageUrl = `https://storage.googleapis.com/${bucket.name}/${imageFileName}`;
            const thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${thumbnailFileName}`;
            
            console.log(chalk.green(`✅ Images uploaded successfully`));
            console.log(chalk.gray(`   Main image: ${imageUrl}`));
            console.log(chalk.gray(`   Thumbnail: ${thumbnailUrl}`));
            
            // Clean up thumbnail
            if (fs.existsSync(thumbnail.path)) {
                fs.unlinkSync(thumbnail.path);
            }
            
            return {
                success: true,
                imageUrl: imageUrl,
                thumbnailUrl: thumbnailUrl,
                imagePath: imageFileName,
                thumbnailPath: thumbnailFileName,
                size: fs.statSync(imagePath).size,
                thumbnailSize: thumbnail.size
            };
            
        } catch (error) {
            console.error(chalk.red(`❌ Firebase upload failed: ${error.message}`));
            throw new Error(`Firebase upload failed: ${error.message}`);
        }
    }
    
    /**
     * Complete image processing workflow
     */
    async processEventImage(imageUrl, eventId) {
        let downloadedImage = null;
        let processedImage = null;
        
        try {
            // Download image
            downloadedImage = await this.downloadImage(imageUrl, eventId);
            
            // Process image
            processedImage = await this.processImage(downloadedImage.path, eventId);
            
            // Upload to Firebase
            const uploadResult = await this.uploadToFirebase(processedImage.path, eventId);
            
            console.log(chalk.green(`🎉 Image processing complete for event: ${eventId}`));
            
            return uploadResult;
            
        } catch (error) {
            console.error(chalk.red(`❌ Image processing workflow failed: ${error.message}`));
            return {
                success: false,
                error: error.message
            };
            
        } finally {
            // Clean up temporary files
            this.cleanupTempFiles([
                downloadedImage?.path,
                processedImage?.path
            ]);
        }
    }
    
    /**
     * Clean up temporary files
     */
    cleanupTempFiles(filePaths) {
        for (const filePath of filePaths) {
            if (filePath && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(chalk.gray(`🗑️  Cleaned up: ${path.basename(filePath)}`));
                } catch (error) {
                    console.warn(chalk.yellow(`⚠️  Could not clean up ${filePath}: ${error.message}`));
                }
            }
        }
    }
    
    /**
     * Validate image URL
     */
    isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const parsed = new URL(url);
            const pathname = parsed.pathname.toLowerCase();
            
            return this.SUPPORTED_FORMATS.some(format => 
                pathname.includes(format) || pathname.endsWith(`.${format}`)
            );
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get image dimensions without downloading
     */
    async getImageInfo(imageUrl) {
        try {
            const response = await axios({
                method: 'HEAD',
                url: imageUrl,
                timeout: 10000
            });
            
            return {
                contentLength: parseInt(response.headers['content-length'] || '0'),
                contentType: response.headers['content-type'] || '',
                valid: response.status === 200
            };
            
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
    
    /**
     * Batch process multiple images
     */
    async processMultipleImages(imageData) {
        const results = [];
        
        for (const { imageUrl, eventId } of imageData) {
            try {
                console.log(chalk.blue(`\n📸 Processing image for event: ${eventId}`));
                
                const result = await this.processEventImage(imageUrl, eventId);
                results.push({
                    eventId: eventId,
                    imageUrl: imageUrl,
                    ...result
                });
                
                // Add delay between uploads to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(chalk.red(`❌ Failed to process image for ${eventId}: ${error.message}`));
                results.push({
                    eventId: eventId,
                    imageUrl: imageUrl,
                    success: false,
                    error: error.message
                });
            }
        }
        
        const successful = results.filter(r => r.success).length;
        const failed = results.length - successful;
        
        console.log(chalk.blue(`\n📸 Batch image processing complete:`));
        console.log(chalk.green(`   Successful: ${successful}`));
        console.log(chalk.red(`   Failed: ${failed}`));
        
        return results;
    }
    
    /**
     * Check if event already has image in Firebase
     */
    async eventHasImage(eventId) {
        if (!this.initStorage()) return false;
        
        try {
            const bucket = this.storage.bucket();
            const imagePaths = [
                `events/${eventId}/event_image.png`,
                `events/${eventId}/event_thumbnail.png`,
                `events/${eventId}/event_image.jpg`,
                `events/${eventId}/event_thumbnail.jpg`,
                // Check legacy paths without extensions for backward compatibility
                `events/${eventId}/event_image`,
                `events/${eventId}/event_thumbnail`
            ];
            
            for (const imagePath of imagePaths) {
                const file = bucket.file(imagePath);
                const [exists] = await file.exists();
                
                if (exists) {
                    console.log(chalk.cyan(`📷 Event ${eventId} already has image: ${imagePath}`));
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Error checking existing image for ${eventId}: ${error.message}`));
            return false;
        }
    }
}

module.exports = ImageHandler;