#!/usr/bin/env node

/**
 * Fix Lagos Island Event Images
 * Re-upload with proper file extensions
 */

const ImageHandler = require('./utils/imageHandler');
const admin = require('firebase-admin');
const path = require('path');

async function fixLagosImages() {
    try {
        console.log('🔧 Fixing Lagos Island event images with proper extensions...');
        
        // Initialize Firebase
        const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
        const serviceAccount = require(serviceAccountPath);
        
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
                storageBucket: `${serviceAccount.project_id}.appspot.com`
            });
        }
        
        const eventId = '751biOmwjEQI6mmWaHAZ';
        const imageUrl = 'https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1096264123%2F232815302468%2F1%2Foriginal.20250814-215506?crop=focalpoint&fit=crop&w=1000&auto=format%2Ccompress&q=75&sharp=10&fp-x=0.469696969697&fp-y=0.203571428571&s=914aa5d33fc24bfc6f604c923331857e';
        
        console.log(`📅 Event ID: ${eventId}`);
        console.log(`🖼️  Image URL: ${imageUrl}`);
        
        // Delete old images without extensions
        const bucket = admin.storage().bucket();
        const oldImagePaths = [
            `events/${eventId}/event_image`,
            `events/${eventId}/event_thumbnail`
        ];
        
        for (const oldPath of oldImagePaths) {
            try {
                const file = bucket.file(oldPath);
                const [exists] = await file.exists();
                if (exists) {
                    await file.delete();
                    console.log(`🗑️  Deleted old image: ${oldPath}`);
                }
            } catch (error) {
                console.log(`ℹ️  Old image not found: ${oldPath}`);
            }
        }
        
        // Re-upload with proper extensions
        const imageHandler = new ImageHandler();
        const result = await imageHandler.processEventImage(imageUrl, eventId);
        
        if (result.success) {
            console.log('✅ Lagos Island images re-uploaded successfully with extensions!');
            console.log(`📁 Main image: ${result.imageUrl}`);
            console.log(`📁 Thumbnail: ${result.thumbnailUrl}`);
        } else {
            console.error('❌ Failed to re-upload images:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Error fixing Lagos images:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    fixLagosImages();
}

module.exports = fixLagosImages;