#!/usr/bin/env python3
"""
Firebase Storage Event Image Generator

Generates event_image.png files for events that only have thumbnails.
Processes all events in the 'events' Firebase Storage folder.
Upscales thumbnails to full-size images with quality enhancement.

Usage:
    python generate_missing_images.py

Requirements:
    pip install firebase-admin pillow

This script will:
1. Connect to Firebase Storage
2. Scan the 'events' folder for all event directories
3. Find events that have event_thumbnail.png but no event_image.png
4. Download the thumbnail, upscale it to full-size image, and upload it
5. Use smart upscaling techniques to maintain quality
"""

import os
import sys
from pathlib import Path
import json
from typing import List, Tuple, Optional
import io
from PIL import Image, ImageFilter, ImageEnhance
import firebase_admin
from firebase_admin import credentials, storage, firestore
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
import time
import logging
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('image_generation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MissingImageGenerator:
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

    def get_events_needing_images(self, collection: str, months_back: int = 3) -> List[str]:
        """Get list of event IDs that need event_image generated from thumbnails (last N months only)"""
        logger.info(f"🔍 Scanning {collection} for events needing event_image (last {months_back} months)...")
        
        events_needing_images = []
        cutoff_date = datetime.now() - timedelta(days=months_back * 30)  # Approximate months to days
        
        try:
            # List all blobs in the collection folder
            blobs = self.bucket.list_blobs(prefix=f"{collection}/")
            
            # Group blobs by event ID and check dates
            events = {}
            recent_events = set()
            
            for blob in blobs:
                path_parts = blob.name.split('/')
                if len(path_parts) >= 3:  # collection/eventID/filename
                    event_id = path_parts[1]
                    filename = path_parts[2]
                    
                    # Check if this is a recent thumbnail to determine if event is recent
                    if filename in ['event_thumbnail.png', 'event_thumbnail.jpg']:
                        blob.reload()  # Load metadata
                        if blob.time_created and blob.time_created.replace(tzinfo=None) >= cutoff_date:
                            recent_events.add(event_id)
                    
                    if event_id not in events:
                        events[event_id] = {'has_image': False, 'has_thumbnail': False}
                    
                    if filename in ['event_image.png', 'event_image.jpg']:
                        events[event_id]['has_image'] = True
                    elif filename in ['event_thumbnail.png', 'event_thumbnail.jpg']:
                        events[event_id]['has_thumbnail'] = True
            
            # Find recent events that have thumbnails but no images
            for event_id, files in events.items():
                if (event_id in recent_events and 
                    files['has_thumbnail'] and 
                    not files['has_image']):
                    events_needing_images.append(event_id)
            
            logger.info(f"📊 Found {len(events_needing_images)} recent events in {collection} needing event_image")
            logger.info(f"🕐 Date filter: Events created after {cutoff_date.strftime('%Y-%m-%d')}")
            return events_needing_images
            
        except Exception as e:
            logger.error(f"❌ Error scanning {collection}: {e}")
            return []

    def download_thumbnail(self, collection: str, event_id: str) -> Optional[bytes]:
        """Download the thumbnail image"""
        try:
            # Try PNG first, then JPG
            for ext in ['png', 'jpg']:
                blob_path = f"{collection}/{event_id}/event_thumbnail.{ext}"
                blob = self.bucket.blob(blob_path)
                
                if blob.exists():
                    logger.info(f"📥 Downloading {blob_path}")
                    return blob.download_as_bytes()
            
            logger.warning(f"⚠️ No event_thumbnail found for {collection}/{event_id}")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error downloading thumbnail for {event_id}: {e}")
            return None

    def upscale_image(self, thumbnail_data: bytes, target_size: tuple = (800, 800)) -> Optional[bytes]:
        """Upscale thumbnail to full-size image with quality enhancement"""
        try:
            # Open the thumbnail
            img = Image.open(io.BytesIO(thumbnail_data))
            original_width, original_height = img.size
            aspect_ratio = original_width / original_height
            
            logger.info(f"📐 Original thumbnail size: {original_width}x{original_height} (ratio: {aspect_ratio:.2f})")
            
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Calculate new size maintaining aspect ratio
            target_width, target_height = target_size
            
            if aspect_ratio >= 1:  # Landscape or square
                new_width = min(target_width, int(target_height * aspect_ratio))
                new_height = int(new_width / aspect_ratio)
            else:  # Portrait
                new_height = min(target_height, int(target_width / aspect_ratio))
                new_width = int(new_height * aspect_ratio)
            
            # Use high-quality upscaling
            if original_width < new_width or original_height < new_height:
                # Apply slight sharpening before upscaling for better results
                img = img.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))
                
                # Use LANCZOS for high-quality upscaling
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Enhance the upscaled image
                enhancer = ImageEnhance.Sharpness(img)
                img = enhancer.enhance(1.1)  # Slight sharpening
                
                enhancer = ImageEnhance.Color(img)
                img = enhancer.enhance(1.05)  # Slight color enhancement
            else:
                # If thumbnail is already large enough, just resize
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save as high-quality PNG
            output = io.BytesIO()
            img.save(output, format='PNG', optimize=True, compress_level=6)
            output.seek(0)
            result = output.read()
            
            logger.info(f"🖼️ Upscaled image: {new_width}x{new_height}, {len(result)} bytes")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error upscaling image: {e}")
            return None

    def upload_image(self, collection: str, event_id: str, image_data: bytes) -> bool:
        """Upload full-size image to Firebase Storage"""
        try:
            blob_path = f"{collection}/{event_id}/event_image.png"
            blob = self.bucket.blob(blob_path)
            
            # Upload as PNG
            blob.upload_from_string(image_data, content_type='image/png')
            
            logger.info(f"✅ Uploaded image: {blob_path} ({len(image_data)} bytes)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error uploading image for {event_id}: {e}")
            return False

    def process_event(self, collection: str, event_id: str) -> bool:
        """Process a single event - download thumbnail, upscale, upload image"""
        try:
            logger.info(f"🚀 Processing {collection}/{event_id}")
            
            # Download thumbnail
            thumbnail_data = self.download_thumbnail(collection, event_id)
            if not thumbnail_data:
                self.error_count += 1
                return False
            
            # Upscale thumbnail to full-size image
            image_data = self.upscale_image(thumbnail_data)
            if not image_data:
                self.error_count += 1
                return False
            
            # Upload full-size image
            if self.upload_image(collection, event_id, image_data):
                self.processed_count += 1
                return True
            else:
                self.error_count += 1
                return False
                
        except Exception as e:
            logger.error(f"❌ Error processing {collection}/{event_id}: {e}")
            self.error_count += 1
            return False

    def generate_missing_images(self, max_workers: int = 3):
        """Main function to generate all missing event_image files"""
        logger.info("🏁 Starting missing image generation process")
        start_time = time.time()
        
        collections = ['events']
        
        for collection in collections:
            logger.info(f"\n📁 Processing collection: {collection}")
            
            # Get events needing images
            events = self.get_events_needing_images(collection)
            
            if not events:
                logger.info(f"✅ No event_image files needed for {collection}")
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
        logger.info(f"✅ Successfully processed: {self.processed_count} images")
        logger.info(f"⏭️ Skipped (already existed): {self.skipped_count}")
        logger.info(f"❌ Errors encountered: {self.error_count}")
        logger.info(f"⏱️ Total time: {elapsed_time:.2f} seconds")
        
        if self.processed_count > 0:
            logger.info(f"🚀 Average processing time: {elapsed_time/self.processed_count:.2f} seconds per image")
        
        if self.processed_count == 0:
            logger.info("ℹ️ No images were generated. This could mean:")
            logger.info("   - All events already have event_image files")
            logger.info("   - No events found with only thumbnails")
            logger.info("   - Connection or permission issues")

def main():
    """Main entry point"""
    print("🖼️ Firebase Missing Event Image Generator")
    print("==========================================")
    print("📈 Upscales thumbnails to full-size images")
    print("✨ Enhances quality during upscaling")
    print("🔥 Processes events that only have thumbnails")
    print("🕐 Filters to last 3 months only")
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
    generator = MissingImageGenerator(service_account_path)
    
    try:
        generator.generate_missing_images(max_workers=3)  # Conservative for Firebase limits
        print("\n🎉 Missing image generation completed!")
        
    except KeyboardInterrupt:
        print("\n⛔ Process interrupted by user")
        print("💡 Partial progress has been saved to Firebase Storage")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        logger.exception("Full error details:")
        sys.exit(1)

if __name__ == "__main__":
    main()