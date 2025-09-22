#!/usr/bin/env node

/**
 * Mai Tai Day 2025 Image Upload Script
 * 
 * This script uploads the Mai Tai Day bartender image to Firebase Storage
 * and updates the event document with the image URLs.
 */

const EventImageUploader = require('./uploadEventImage');

async function uploadMaiTaiDayImage() {
    try {
        console.log('🍹 Mai Tai Day 2025 - Image Upload Process');
        console.log('='.repeat(50));
        
        const uploader = new EventImageUploader();
        
        // Event details
        const eventDetails = {
            eventId: 'jhwJ06px3cJMPXWVaCxf',
            collection: 'bayAreaEvents',
            title: 'Mai Tai Day 2025',
            venue: '9 Anchor Drive',
            address: '9 Anchor Drive, Emeryville, CA 94608',
            date: 'August 31, 2025'
        };
        
        console.log('Event Details:');
        console.log(`  Title: ${eventDetails.title}`);
        console.log(`  Venue: ${eventDetails.venue}`);
        console.log(`  Address: ${eventDetails.address}`);
        console.log(`  Date: ${eventDetails.date}`);
        console.log(`  Document ID: ${eventDetails.eventId}`);
        console.log(`  Collection: ${eventDetails.collection}`);
        console.log('');
        
        // Check for the new bartender image
        const imagePath = './mai-tai-bartender.jpg';
        const fs = require('fs');
        
        if (!fs.existsSync(imagePath)) {
            console.log('📋 INSTRUCTIONS:');
            console.log('1. Save the new Mai Tai bartender image (the one with yellow cap) to this scripts folder');
            console.log('2. Name it: mai-tai-bartender.jpg');
            console.log('3. Then run: node uploadMaiTaiImage.js');
            console.log('');
            console.log('⚠️  Image file not found!');
            console.log(`   Expected: ${imagePath}`);
            console.log('');
            process.exit(1);
        }
        
        console.log('🖼️  Found bartender image, proceeding with upload...');
        
        // Upload the image (creates both event_image.jpg and event_thumbnail.jpg)
        const result = await uploader.uploadEventImage(
            imagePath,
            eventDetails.eventId,
            eventDetails.collection,
            true // Upload both event_image and event_thumbnail versions
        );
        
        console.log('');
        console.log('🎉 SUCCESS! Mai Tai Day 2025 bartender image has been uploaded!');
        console.log('');
        console.log('📸 Uploaded Files:');
        console.log(`  📁 event_image.jpg: ${result.eventImageUrl}`);
        console.log(`  📁 event_thumbnail.jpg: ${result.thumbnailUrl}`);
        console.log('');
        console.log('The event document now has:');
        console.log(`  ✅ event_image: ${result.eventImageUrl}`);
        console.log(`  ✅ event_thumbnail: ${result.thumbnailUrl}`);
        
    } catch (error) {
        console.error('❌ Error uploading Mai Tai Day image:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    uploadMaiTaiDayImage();
}

module.exports = uploadMaiTaiDayImage;