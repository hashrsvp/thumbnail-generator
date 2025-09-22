#!/usr/bin/env python3
"""
Full scan of both collections to see thumbnail coverage
"""

import firebase_admin
from firebase_admin import credentials, storage
import sys

def full_scan():
    try:
        # Initialize Firebase if not already done
        if not firebase_admin._apps:
            cred = credentials.Certificate('./serviceAccountKey.json')
            firebase_admin.initialize_app(cred, {
                'storageBucket': 'hash-836eb.appspot.com'
            })
        
        bucket = storage.bucket()
        
        collections = ['bayAreaEvents', 'austinEvents']
        
        for collection in collections:
            print(f"\n🔍 Scanning {collection}...")
            
            all_blobs = bucket.list_blobs(prefix=f"{collection}/")
            events = {}
            
            for blob in all_blobs:
                path_parts = blob.name.split('/')
                if len(path_parts) >= 3:
                    event_id = path_parts[1]
                    filename = path_parts[2]
                    
                    if event_id not in events:
                        events[event_id] = {
                            'has_image': False, 
                            'has_thumbnail': False,
                            'image_size': 0,
                            'thumbnail_size': 0
                        }
                    
                    if filename in ['event_image.png', 'event_image.jpg']:
                        events[event_id]['has_image'] = True
                        events[event_id]['image_size'] = blob.size
                    elif filename in ['event_thumbnail.png', 'event_thumbnail.jpg']:
                        events[event_id]['has_thumbnail'] = True
                        events[event_id]['thumbnail_size'] = blob.size
            
            # Calculate stats
            total_events = len(events)
            with_images = len([e for e in events.values() if e['has_image']])
            with_thumbnails = len([e for e in events.values() if e['has_thumbnail']])
            need_thumbnails = [event_id for event_id, data in events.items() if data['has_image'] and not data['has_thumbnail']]
            
            print(f"📊 {collection} Stats:")
            print(f"   Total events: {total_events}")
            print(f"   Events with images: {with_images}")
            print(f"   Events with thumbnails: {with_thumbnails}")
            print(f"   Events needing thumbnails: {len(need_thumbnails)}")
            
            if need_thumbnails:
                print(f"🎯 Sample events needing thumbnails:")
                for event_id in need_thumbnails[:5]:  # Show first 5
                    size_mb = events[event_id]['image_size'] / (1024 * 1024)
                    print(f"   - {event_id} (image: {size_mb:.1f}MB)")
                if len(need_thumbnails) > 5:
                    print(f"   ... and {len(need_thumbnails) - 5} more")
            
            # Show some examples with thumbnails
            with_both = [(event_id, data) for event_id, data in events.items() if data['has_image'] and data['has_thumbnail']]
            if with_both:
                print(f"✅ Sample events WITH thumbnails:")
                for event_id, data in with_both[:3]:  # Show first 3
                    image_mb = data['image_size'] / (1024 * 1024)
                    thumb_kb = data['thumbnail_size'] / 1024
                    print(f"   - {event_id}")
                    print(f"     Image: {image_mb:.1f}MB, Thumbnail: {thumb_kb:.1f}KB")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    full_scan()