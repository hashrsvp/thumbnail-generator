#!/usr/bin/env node

/**
 * Upload Event Image Script
 * 
 * Uploads an image to Firebase Storage and updates the event document
 * with the new image URLs for both event_image and event_thumbnail.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);

class EventImageUploader {
    constructor() {
        this.db = null;
        this.storage = null;
        this.bucket = null;
        this.initialized = false;
    }

    /**
     * Initialize Firebase Admin SDK
     */
    async initialize() {
        if (this.initialized) return true;

        try {
            // Use the existing service account key
            const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
            
            if (!fs.existsSync(serviceAccountPath)) {
                throw new Error(`Firebase service account key not found at: ${serviceAccountPath}`);
            }

            const serviceAccount = require(serviceAccountPath);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
                storageBucket: `${serviceAccount.project_id}.appspot.com`
            });

            this.db = admin.firestore();
            this.storage = admin.storage();
            this.bucket = this.storage.bucket();
            this.initialized = true;

            console.log('✅ Firebase initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Firebase initialization failed:', error.message);
            return false;
        }
    }

    /**
     * Compress image for thumbnail (under 60KB)
     */
    async compressThumbnail(imageBuffer) {
        let quality = 85;
        let compressedBuffer;
        
        do {
            compressedBuffer = await sharp(imageBuffer)
                .resize(400, 400, { 
                    fit: 'inside', 
                    withoutEnlargement: true 
                })
                .jpeg({ 
                    quality: quality,
                    progressive: true,
                    mozjpeg: true 
                })
                .toBuffer();
                
            console.log(`🔄 Thumbnail compression attempt: ${quality}% quality = ${(compressedBuffer.length / 1024).toFixed(1)}KB`);
            
            if (compressedBuffer.length <= 60 * 1024) {
                break;
            }
            
            quality -= 10;
        } while (quality >= 30 && compressedBuffer.length > 60 * 1024);
        
        const finalSizeKB = (compressedBuffer.length / 1024).toFixed(1);
        console.log(`✅ Thumbnail compressed to ${finalSizeKB}KB (quality: ${quality}%)`);
        
        return compressedBuffer;
    }

    /**
     * Upload image to Firebase Storage with proper naming
     */
    async uploadImage(imagePath, eventId, imageType = 'event_image') {
        let imageBuffer = await readFile(imagePath);
        const fileExtension = path.extname(imagePath).toLowerCase() || '.jpg';
        const fileName = `events/${eventId}/${imageType}${fileExtension}`;
        
        // Compress thumbnail if needed
        if (imageType === 'event_thumbnail') {
            imageBuffer = await this.compressThumbnail(imageBuffer);
            console.log(`📏 Final thumbnail size: ${(imageBuffer.length / 1024).toFixed(1)}KB`);
        }
        
        // Determine content type (force JPEG for thumbnails)
        const contentType = (imageType === 'event_thumbnail') ? 'image/jpeg' : 
                           (fileExtension === '.png' ? 'image/png' : 'image/jpeg');
        
        // Upload to Firebase Storage
        const file = this.bucket.file(fileName);
        
        await file.save(imageBuffer, {
            metadata: {
                contentType: contentType,
                metadata: {
                    eventId: eventId,
                    uploadDate: new Date().toISOString(),
                    purpose: imageType,
                    ...(imageType === 'event_thumbnail' && { 
                        sizeKB: (imageBuffer.length / 1024).toFixed(1),
                        compressed: true 
                    })
                }
            }
        });

        // Make the file publicly readable
        await file.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
        
        console.log(`✅ ${imageType} uploaded successfully:`, publicUrl);
        return publicUrl;
    }

    /**
     * Update Firestore document with image URLs
     */
    async updateEventDocument(eventId, collection, eventImageUrl, thumbnailUrl = null) {
        const docRef = this.db.collection(collection).doc(eventId);
        
        const updateData = {
            event_image: eventImageUrl,
            event_thumbnail: thumbnailUrl || eventImageUrl, // Use thumbnail if provided, otherwise same as event_image
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await docRef.update(updateData);

        console.log('✅ Event document updated successfully');
        console.log(`   Collection: ${collection}`);
        console.log(`   Document ID: ${eventId}`);
        console.log(`   Event Image URL: ${eventImageUrl}`);
        console.log(`   Thumbnail URL: ${thumbnailUrl || eventImageUrl}`);
    }

    /**
     * Main upload process - uploads both event_image and event_thumbnail
     */
    async uploadEventImage(imagePath, eventId, collection, uploadBothTypes = true) {
        console.log('🚀 Starting image upload process...');
        console.log(`   Image: ${imagePath}`);
        console.log(`   Event ID: ${eventId}`);
        console.log(`   Collection: ${collection}`);

        // Initialize Firebase
        const initialized = await this.initialize();
        if (!initialized) {
            throw new Error('Failed to initialize Firebase');
        }

        // Check if image file exists
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file not found: ${imagePath}`);
        }

        let eventImageUrl, thumbnailUrl;

        if (uploadBothTypes) {
            // Upload as both event_image and event_thumbnail
            eventImageUrl = await this.uploadImage(imagePath, eventId, 'event_image');
            thumbnailUrl = await this.uploadImage(imagePath, eventId, 'event_thumbnail');
        } else {
            // Upload just as event_image (will be used for both)
            eventImageUrl = await this.uploadImage(imagePath, eventId, 'event_image');
            thumbnailUrl = eventImageUrl;
        }

        // Update Firestore document
        await this.updateEventDocument(eventId, collection, eventImageUrl, thumbnailUrl);

        console.log('🎉 Image upload and document update completed successfully!');
        return {
            success: true,
            eventImageUrl: eventImageUrl,
            thumbnailUrl: thumbnailUrl,
            eventId: eventId,
            collection: collection
        };
    }
}

// Command line usage
if (require.main === module) {
    const uploader = new EventImageUploader();
    
    // Event details from your message
    const eventId = 'jhwJ06px3cJMPXWVaCxf';
    const collection = 'bayAreaEvents';
    
    // You'll need to save the image to a file and provide the path
    console.log('⚠️  Please save your Mai Tai Day image to a file and run:');
    console.log(`   node ${__filename} <path-to-image>`);
    
    if (process.argv[2]) {
        const imagePath = process.argv[2];
        
        uploader.uploadEventImage(imagePath, eventId, collection)
            .then(result => {
                console.log('\n🎊 SUCCESS! Event image uploaded and document updated.');
                process.exit(0);
            })
            .catch(error => {
                console.error('\n❌ ERROR:', error.message);
                process.exit(1);
            });
    }
}

module.exports = EventImageUploader;