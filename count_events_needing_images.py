#!/usr/bin/env python3
"""
Firebase Storage Event Count Script

Counts how many events have only thumbnails (no full-size images).
Quick scan to see remaining work.

Usage:
    python count_events_needing_images.py

Requirements:
    pip install firebase-admin
"""

import os
import sys
import firebase_admin
from firebase_admin import credentials, storage
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class EventCounter:
    def __init__(self, service_account_path: str = None):
        """Initialize Firebase connection"""
        self.bucket = None
        
        try:
            # Initialize Firebase Admin SDK
            if service_account_path and os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred, {
                    'storageBucket': 'hash-836eb.appspot.com'
                })
            else:
                # Use default credentials
                firebase_admin.initialize_app()
            
            self.bucket = storage.bucket()
            logger.info("✅ Firebase initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Firebase: {e}")
            sys.exit(1)

    def count_events_needing_images(self, collection: str = "events"):
        """Count events that need event_image generated"""
        logger.info(f"🔍 Scanning {collection} for events needing event_image...")
        
        events = {}
        total_blobs = 0
        
        try:
            # List all blobs in the collection folder
            blobs = self.bucket.list_blobs(prefix=f"{collection}/")
            
            for blob in blobs:
                total_blobs += 1
                if total_blobs % 1000 == 0:
                    logger.info(f"📊 Processed {total_blobs} blobs...")
                    
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
            
            # Count different categories
            total_events = len(events)
            events_with_both = sum(1 for e in events.values() if e['has_image'] and e['has_thumbnail'])
            events_with_only_image = sum(1 for e in events.values() if e['has_image'] and not e['has_thumbnail'])
            events_with_only_thumbnail = sum(1 for e in events.values() if not e['has_image'] and e['has_thumbnail'])
            events_with_neither = sum(1 for e in events.values() if not e['has_image'] and not e['has_thumbnail'])
            
            logger.info(f"\n📊 SCAN RESULTS:")
            logger.info(f"=" * 50)
            logger.info(f"🔢 Total events found: {total_events:,}")
            logger.info(f"🔢 Total blobs processed: {total_blobs:,}")
            logger.info(f"")
            logger.info(f"✅ Events with both image & thumbnail: {events_with_both:,}")
            logger.info(f"🖼️  Events with only full image: {events_with_only_image:,}")
            logger.info(f"📷 Events with only thumbnail: {events_with_only_thumbnail:,}")
            logger.info(f"❌ Events with neither: {events_with_neither:,}")
            logger.info(f"")
            logger.info(f"🎯 EVENTS NEEDING IMAGES: {events_with_only_thumbnail:,}")
            
            if events_with_only_thumbnail > 0:
                batches_of_500 = (events_with_only_thumbnail + 499) // 500  # Round up
                logger.info(f"📦 Batches needed (500 each): {batches_of_500}")
                estimated_time = batches_of_500 * 12.5  # ~12.5 minutes per batch
                logger.info(f"⏱️  Estimated total time: {estimated_time:.1f} minutes")
            
            return events_with_only_thumbnail
            
        except Exception as e:
            logger.error(f"❌ Error scanning {collection}: {e}")
            return 0

def main():
    """Main entry point"""
    print("🔢 Firebase Event Counter - Events Needing Images")
    print("=" * 52)
    print("🔍 Scanning for events with only thumbnails...")
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
        print("⚠️ No service account key found. Using default credentials...")
    
    print()
    
    # Create counter and run
    counter = EventCounter(service_account_path)
    
    try:
        count = counter.count_events_needing_images()
        print(f"\n🎯 FINAL COUNT: {count:,} events need full-size images")
        
    except KeyboardInterrupt:
        print("\n⛔ Scan interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        logger.exception("Full error details:")
        sys.exit(1)

if __name__ == "__main__":
    main()