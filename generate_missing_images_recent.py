#!/usr/bin/env python3
"""
Firebase Storage Event Image Generator (Recent Events)

Generates event_image.png files for events that only have thumbnails.
Focuses on recent events by using a different scanning approach.
Upscales thumbnails to full-size images with quality enhancement.

Usage:
    python generate_missing_images_recent.py

Requirements:
    pip install firebase-admin pillow

This script will:
1. Connect to Firebase Storage
2. Scan events in reverse order to get recent ones first
3. Find events that have event_thumbnail.png but no event_image.png
4. Process the most recent 100 events found
5. Download thumbnails, upscale them to full-size images, and upload
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
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('image_generation_recent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class RecentImageGenerator:
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

    def get_recent_events_needing_images(self, collection: str, max_events: int = 100) -> List[str]:
        """Get recent events that need event_image generated (fast approach)"""
        logger.info(f"🔍 Scanning {collection} for recent events needing event_image (max {max_events})...")
        
        events_needing_images = []
        events_checked = {}
        found_count = 0
        
        try:
            # List all blobs in the collection folder
            blobs = list(self.bucket.list_blobs(prefix=f"{collection}/"))
            
            # Process blobs in reverse order (more recent events tend to be later)
            logger.info(f"📊 Processing {len(blobs)} blobs to find recent events...")
            
            for blob in reversed(blobs):
                if found_count >= max_events:
                    break
                    
                path_parts = blob.name.split('/')
                if len(path_parts) >= 3:  # collection/eventID/filename
                    event_id = path_parts[1]
                    filename = path_parts[2]
                    
                    # Skip if we already checked this event
                    if event_id in events_checked:
                        continue
                    
                    # Only look for thumbnail files to identify candidate events
                    if filename in ['event_thumbnail.png', 'event_thumbnail.jpg']:
                        # Check if this event has both thumbnail and image
                        has_image = self.check_event_has_image(collection, event_id)
                        
                        if not has_image:
                            events_needing_images.append(event_id)
                            found_count += 1
                            logger.info(f"🆕 Found recent event needing image: {event_id} ({found_count}/{max_events})")
                        
                        events_checked[event_id] = True
            
            logger.info(f"📊 Found {len(events_needing_images)} recent events in {collection} needing event_image")
            return events_needing_images
            
        except Exception as e:
            logger.error(f"❌ Error scanning {collection}: {e}")
            return []

    def check_event_has_image(self, collection: str, event_id: str) -> bool:
        """Quick check if event already has an image file"""
        try:
            for ext in ['png', 'jpg']:
                blob_path = f"{collection}/{event_id}/event_image.{ext}"
                blob = self.bucket.blob(blob_path)
                if blob.exists():
                    return True
            return False
        except Exception:
            return False

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

    def upscale_image(self, thumbnail_data: bytes, target_size: tuple = (800, 800), max_file_size: int = 1024 * 1024) -> Optional[bytes]:
        """Upscale thumbnail to full-size image with quality enhancement and 1MB size limit"""
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
            
            # Try to save within size limit - start with PNG, then try JPEG if needed
            result = self._optimize_image_size(img, max_file_size, new_width, new_height)
            
            if result:
                logger.info(f"🖼️ Upscaled image: {new_width}x{new_height}, {len(result)} bytes")
                return result
            else:
                logger.error(f"❌ Could not optimize image to under {max_file_size} bytes")
                return None
            
        except Exception as e:
            logger.error(f"❌ Error upscaling image: {e}")
            return None

    def _optimize_image_size(self, img: Image.Image, max_size: int, width: int, height: int) -> Optional[bytes]:
        """Optimize image to stay under max_size bytes"""
        try:
            # First try PNG with high compression
            output = io.BytesIO()
            img.save(output, format='PNG', optimize=True, compress_level=9)
            png_size = output.tell()
            
            if png_size <= max_size:
                output.seek(0)
                return output.read()
            
            # If PNG is too large, try JPEG with quality optimization
            quality = 95
            scale_factor = 1.0
            
            while quality > 30 and scale_factor > 0.5:
                # Try current settings
                current_img = img
                
                # Scale down if needed
                if scale_factor < 1.0:
                    scaled_width = int(width * scale_factor)
                    scaled_height = int(height * scale_factor)
                    current_img = img.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)
                
                output = io.BytesIO()
                current_img.save(output, format='JPEG', quality=quality, optimize=True)
                jpeg_size = output.tell()
                
                if jpeg_size <= max_size:
                    output.seek(0)
                    actual_width, actual_height = current_img.size
                    logger.info(f"📏 Optimized to JPEG: {actual_width}x{actual_height}, quality={quality}, scale={scale_factor:.2f}")
                    return output.read()
                
                # Adjust parameters for next iteration
                if quality > 70:
                    quality -= 10
                elif quality > 50:
                    quality -= 5
                else:
                    # Start scaling down while maintaining reasonable quality
                    quality = 80
                    scale_factor -= 0.1
            
            # Final attempt with very low quality but original size
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=30, optimize=True)
            final_size = output.tell()
            
            if final_size <= max_size:
                output.seek(0)
                logger.info(f"📏 Final JPEG: {width}x{height}, quality=30")
                return output.read()
            
            # If still too large, scale down more aggressively
            scale_factor = 0.7
            while scale_factor > 0.3:
                scaled_width = int(width * scale_factor)
                scaled_height = int(height * scale_factor)
                scaled_img = img.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)
                
                output = io.BytesIO()
                scaled_img.save(output, format='JPEG', quality=60, optimize=True)
                
                if output.tell() <= max_size:
                    output.seek(0)
                    logger.info(f"📏 Scaled JPEG: {scaled_width}x{scaled_height}, quality=60, scale={scale_factor:.2f}")
                    return output.read()
                
                scale_factor -= 0.1
            
            logger.warning(f"⚠️ Could not optimize image to under {max_size} bytes")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error optimizing image size: {e}")
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

    def generate_missing_images(self, max_workers: int = 3, max_events: int = 100):
        """Main function to generate missing event_image files (recent events)"""
        logger.info(f"🏁 Starting recent image generation process (max {max_events} events)")
        start_time = time.time()
        
        collections = ['events']
        
        for collection in collections:
            logger.info(f"\n📁 Processing collection: {collection}")
            
            # Get recent events needing images
            events = self.get_recent_events_needing_images(collection, max_events)
            
            if not events:
                logger.info(f"✅ No recent event_image files needed for {collection}")
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

def main():
    """Main entry point"""
    print("🖼️ Firebase Missing Event Image Generator (Recent)")
    print("==================================================")
    print("📈 Upscales thumbnails to full-size images")
    print("✨ Enhances quality during upscaling")
    print("🔥 Processes events that only have thumbnails")
    print("⚡ Limited to 100 most recent events")
    print("🎯 Fast scanning approach for recent events")
    print("📏 Enforces 1MB size limit on all images")
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
    generator = RecentImageGenerator(service_account_path)
    
    try:
        generator.generate_missing_images(max_workers=3, max_events=100)
        print("\n🎉 Recent image generation completed!")
        
    except KeyboardInterrupt:
        print("\n⛔ Process interrupted by user")
        print("💡 Partial progress has been saved to Firebase Storage")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        logger.exception("Full error details:")
        sys.exit(1)

if __name__ == "__main__":
    main()