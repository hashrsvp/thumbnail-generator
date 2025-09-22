#!/usr/bin/env python3
"""
Firebase Storage Event Thumbnail Generator

Generates event_thumbnail.png files for events that don't already have them.
Processes all events in the 'events' Firebase Storage folder.
Maintains original aspect ratio while optimizing for 63KB size limit.

Usage:
    python generate_thumbnails.py

Requirements:
    pip install firebase-admin pillow

This script will:
1. Connect to Firebase Storage
2. Scan the 'events' folder for all event directories
3. Find events that have event_image.png but no event_thumbnail.png
4. Download the full image, create an aspect-ratio-preserving thumbnail, and upload it
5. Maintain a 63KB size limit for optimal loading performance
"""

import os
import sys
from pathlib import Path
import json
from typing import List, Tuple, Optional
import io
from PIL import Image
import firebase_admin
from firebase_admin import credentials, storage, firestore
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('thumbnail_generation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ThumbnailGenerator:
    def __init__(self, service_account_path: str = None):
        """Initialize Firebase connection"""
        self.bucket = None
        self.db = None
        self.processed_count = 0
        self.skipped_count = 0
        self.error_count = 0
        
        try:
            # Initialize Firebase Admin SDK
            if service_account_path and os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred, {
                    'storageBucket': 'hash-836eb.appspot.com'
                })
            else:
                # Use default credentials (if running on Google Cloud or with GOOGLE_APPLICATION_CREDENTIALS)
                firebase_admin.initialize_app()
            
            self.bucket = storage.bucket()
            self.db = firestore.client()
            logger.info("✅ Firebase initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Firebase: {e}")
            sys.exit(1)

    def get_events_needing_thumbnails(self, collection: str) -> List[str]:
        """Get list of event IDs that need thumbnails generated"""
        logger.info(f"🔍 Scanning {collection} for events needing thumbnails...")
        
        events_needing_thumbnails = []
        
        try:
            # List all blobs in the collection folder
            blobs = self.bucket.list_blobs(prefix=f"{collection}/")
            
            # Group blobs by event ID
            events = {}
            for blob in blobs:
                path_parts = blob.name.split('/')
                if len(path_parts) >= 3:  # collection/eventID/filename
                    event_id = path_parts[1]
                    filename = path_parts[2]
                    
                    if event_id not in events:
                        events[event_id] = {'has_image': False, 'has_thumbnail': False}
                    
                    if filename in ['event_image.png', 'event_image.jpg']:
                        events[event_id]['has_image'] = True
                    elif filename in ['event_thumbnail.png', 'event_thumbnail.jpg']:
                        events[event_id]['has_thumbnail'] = True
            
            # Find events that have images but no thumbnails
            for event_id, files in events.items():
                if files['has_image'] and not files['has_thumbnail']:
                    events_needing_thumbnails.append(event_id)
            
            logger.info(f"📊 Found {len(events_needing_thumbnails)} events in {collection} needing thumbnails")
            return events_needing_thumbnails
            
        except Exception as e:
            logger.error(f"❌ Error scanning {collection}: {e}")
            return []

    def download_image(self, collection: str, event_id: str) -> Optional[bytes]:
        """Download the original event image"""
        try:
            # Try PNG first, then JPG
            for ext in ['png', 'jpg']:
                blob_path = f"{collection}/{event_id}/event_image.{ext}"
                blob = self.bucket.blob(blob_path)
                
                if blob.exists():
                    logger.info(f"📥 Downloading {blob_path}")
                    return blob.download_as_bytes()
            
            logger.warning(f"⚠️ No event_image found for {collection}/{event_id}")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error downloading image for {event_id}: {e}")
            return None

    def create_thumbnail(self, image_data: bytes, target_size: int = 63 * 1024) -> Optional[bytes]:
        """Create optimized thumbnail preserving aspect ratio with 63KB size limit"""
        try:
            # Open the image
            img = Image.open(io.BytesIO(image_data))
            original_width, original_height = img.size
            aspect_ratio = original_width / original_height
            
            logger.info(f"📐 Original size: {original_width}x{original_height} (ratio: {aspect_ratio:.2f})")
            
            # Convert to RGB if necessary (for JPEG output)
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Start with a max dimension of 400px while preserving aspect ratio
            max_dimension = 400
            
            if original_width >= original_height:
                # Landscape or square - limit width
                new_width = min(max_dimension, original_width)
                new_height = int(new_width / aspect_ratio)
            else:
                # Portrait - limit height
                new_height = min(max_dimension, original_height)
                new_width = int(new_height * aspect_ratio)
            
            # Resize image maintaining aspect ratio
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Optimize to meet size limit while preserving aspect ratio
            quality = 85
            dimension_scale = 1.0
            
            while quality > 15 and dimension_scale > 0.3:
                # Calculate current dimensions
                current_width = int(new_width * dimension_scale)
                current_height = int(new_height * dimension_scale)
                
                # Ensure minimum size
                if current_width < 100 or current_height < 100:
                    break
                
                # Resize if dimensions changed
                if dimension_scale < 1.0:
                    resized_img = img.resize((current_width, current_height), Image.Resampling.LANCZOS)
                else:
                    resized_img = img
                
                # Try PNG first
                output = io.BytesIO()
                resized_img.save(output, format='PNG', optimize=True)
                png_size = output.tell()
                
                if png_size <= target_size:
                    output.seek(0)
                    result = output.read()
                    logger.info(f"📏 Thumbnail (PNG): {current_width}x{current_height}, {len(result)} bytes")
                    return result
                
                # Try JPEG if PNG is too large
                output = io.BytesIO()
                resized_img.save(output, format='JPEG', quality=quality, optimize=True)
                jpeg_size = output.tell()
                
                if jpeg_size <= target_size:
                    output.seek(0)
                    result = output.read()
                    logger.info(f"📏 Thumbnail (JPEG): {current_width}x{current_height}, {len(result)} bytes, quality={quality}")
                    return result
                
                # Adjust parameters for next iteration
                if quality > 50:
                    quality -= 10
                elif quality > 25:
                    quality -= 5
                else:
                    # Reduce dimensions while maintaining aspect ratio
                    dimension_scale -= 0.1
                    quality = 85  # Reset quality when reducing size
            
            # Final attempt with very low quality
            final_width = max(100, int(new_width * 0.5))
            final_height = max(100, int(new_height * 0.5))
            
            final_img = img.resize((final_width, final_height), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            final_img.save(output, format='JPEG', quality=15, optimize=True)
            output.seek(0)
            result = output.read()
            
            logger.info(f"📏 Final thumbnail: {final_width}x{final_height}, {len(result)} bytes")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error creating thumbnail: {e}")
            return None

    def upload_thumbnail(self, collection: str, event_id: str, thumbnail_data: bytes) -> bool:
        """Upload thumbnail to Firebase Storage"""
        try:
            blob_path = f"{collection}/{event_id}/event_thumbnail.png"
            blob = self.bucket.blob(blob_path)
            
            # Detect if this is a JPEG or PNG based on the data
            is_jpeg = thumbnail_data.startswith(b'\xff\xd8\xff')
            content_type = 'image/jpeg' if is_jpeg else 'image/png'
            
            # Upload with proper content type
            blob.upload_from_string(thumbnail_data, content_type=content_type)
            
            logger.info(f"✅ Uploaded thumbnail: {blob_path} ({len(thumbnail_data)} bytes) as {content_type}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error uploading thumbnail for {event_id}: {e}")
            return False

    def process_event(self, collection: str, event_id: str) -> bool:
        """Process a single event - download, create thumbnail, upload"""
        try:
            logger.info(f"🚀 Processing {collection}/{event_id}")
            
            # Download original image
            image_data = self.download_image(collection, event_id)
            if not image_data:
                self.error_count += 1
                return False
            
            # Create thumbnail preserving aspect ratio
            thumbnail_data = self.create_thumbnail(image_data)
            if not thumbnail_data:
                self.error_count += 1
                return False
            
            # Upload thumbnail
            if self.upload_thumbnail(collection, event_id, thumbnail_data):
                self.processed_count += 1
                return True
            else:
                self.error_count += 1
                return False
                
        except Exception as e:
            logger.error(f"❌ Error processing {collection}/{event_id}: {e}")
            self.error_count += 1
            return False

    def generate_thumbnails(self, max_workers: int = 5):
        """Main function to generate all missing thumbnails"""
        logger.info("🏁 Starting thumbnail generation process")
        start_time = time.time()
        
        collections = ['events']
        
        for collection in collections:
            logger.info(f"\n📁 Processing collection: {collection}")
            
            # Get events needing thumbnails
            events = self.get_events_needing_thumbnails(collection)
            
            if not events:
                logger.info(f"✅ No thumbnails needed for {collection}")
                continue
            
            logger.info(f"📋 Will process {len(events)} events with {max_workers} workers")
            
            # Process events in parallel
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {
                    executor.submit(self.process_event, collection, event_id): event_id 
                    for event_id in events
                }
                
                completed = 0
                for future in concurrent.futures.as_completed(futures):
                    event_id = futures[future]
                    completed += 1
                    
                    try:
                        success = future.result()
                        status = "✅" if success else "❌"
                        logger.info(f"{status} [{completed}/{len(events)}] {collection}/{event_id}")
                        
                    except Exception as e:
                        logger.error(f"❌ [{completed}/{len(events)}] Exception processing {event_id}: {e}")
                        self.error_count += 1
        
        # Summary
        elapsed_time = time.time() - start_time
        logger.info(f"\n📊 FINAL SUMMARY:")
        logger.info(f"="*50)
        logger.info(f"✅ Successfully processed: {self.processed_count} thumbnails")
        logger.info(f"⏭️ Skipped (already existed): {self.skipped_count}")
        logger.info(f"❌ Errors encountered: {self.error_count}")
        logger.info(f"⏱️ Total time: {elapsed_time:.2f} seconds")
        
        if self.processed_count > 0:
            logger.info(f"🚀 Average processing time: {elapsed_time/self.processed_count:.2f} seconds per thumbnail")
        
        if self.processed_count == 0:
            logger.info("ℹ️ No thumbnails were generated. This could mean:")
            logger.info("   - All events already have thumbnails")
            logger.info("   - No events found with source images")
            logger.info("   - Connection or permission issues")

def main():
    """Main entry point"""
    print("🎨 Firebase Event Thumbnail Generator")
    print("=====================================")
    print("📐 Preserves original aspect ratio")
    print("⚡ Optimizes for 63KB size limit")
    print("🔥 Processes all events in 'events' folder")
    print()
    
    # Check for service account file
    service_account_paths = [
        './serviceAccountKey.json',
        '../serviceAccountKey.json',
        './Hash/serviceAccountKey.json',
        '../../serviceAccountKey.json',
        os.path.expanduser('~/serviceAccountKey.json'),
    ]
    
    service_account_path = None
    for path in service_account_paths:
        if os.path.exists(path):
            service_account_path = path
            print(f"🔑 Using service account: {path}")
            break
    
    if not service_account_path:
        print("⚠️ No service account key found. Make sure:")
        print("   1. You have serviceAccountKey.json in the project directory, OR")
        print("   2. GOOGLE_APPLICATION_CREDENTIALS environment variable is set")
        print("\n🔄 Continuing with default credentials...")
    
    print()
    
    # Create generator and run
    generator = ThumbnailGenerator(service_account_path)
    
    try:
        generator.generate_thumbnails(max_workers=3)  # Conservative for Firebase limits
        print("\n🎉 Thumbnail generation completed!")
        
    except KeyboardInterrupt:
        print("\n⛔ Process interrupted by user")
        print("💡 Partial progress has been saved to Firebase Storage")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        logger.exception("Full error details:")
        sys.exit(1)

if __name__ == "__main__":
    main()