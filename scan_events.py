#!/usr/bin/env python3
"""
Quick scan of the events folder to see the structure
"""

import firebase_admin
from firebase_admin import credentials, storage
import sys

def scan_events():
    try:
        # Initialize Firebase if not already done
        if not firebase_admin._apps:
            cred = credentials.Certificate('./serviceAccountKey.json')
            firebase_admin.initialize_app(cred, {
                'storageBucket': 'hash-836eb.appspot.com'
            })
        
        bucket = storage.bucket()
        
        print("🔍 Scanning 'events' folder structure...")
        
        # Get first 20 blobs to see the structure
        blobs = bucket.list_blobs(prefix="events/", max_results=50)
        
        events = {}
        sample_files = []
        
        for blob in blobs:
            sample_files.append(blob.name)
            
            path_parts = blob.name.split('/')
            if len(path_parts) >= 3:  # events/eventID/filename
                event_id = path_parts[1]
                filename = path_parts[2]
                
                if event_id not in events:
                    events[event_id] = {'has_image': False, 'has_thumbnail': False, 'files': []}
                
                events[event_id]['files'].append(filename)
                
                if filename in ['event_image.png', 'event_image.jpg']:
                    events[event_id]['has_image'] = True
                elif filename in ['event_thumbnail.png', 'event_thumbnail.jpg']:
                    events[event_id]['has_thumbnail'] = True
        
        print(f"📁 Found {len(events)} events in 'events' folder")
        print(f"📋 Sample file paths:")
        for file_path in sample_files[:10]:
            print(f"   {file_path}")
        if len(sample_files) > 10:
            print(f"   ... and {len(sample_files) - 10} more files")
        
        # Count events needing thumbnails
        need_thumbnails = []
        for event_id, data in events.items():
            if data['has_image'] and not data['has_thumbnail']:
                need_thumbnails.append(event_id)
        
        with_images = len([e for e in events.values() if e['has_image']])
        with_thumbnails = len([e for e in events.values() if e['has_thumbnail']])
        
        print(f"\n📊 Statistics:")
        print(f"   Total events: {len(events)}")
        print(f"   Events with images: {with_images}")
        print(f"   Events with thumbnails: {with_thumbnails}")
        print(f"   Events needing thumbnails: {len(need_thumbnails)}")
        
        # Show sample events needing thumbnails
        if need_thumbnails:
            print(f"\n🎯 Sample events needing thumbnails:")
            for event_id in need_thumbnails[:10]:
                files = ", ".join(events[event_id]['files'])
                print(f"   - {event_id}: {files}")
            if len(need_thumbnails) > 10:
                print(f"   ... and {len(need_thumbnails) - 10} more")
        
        # Show sample events with thumbnails
        with_both = [event_id for event_id, data in events.items() if data['has_image'] and data['has_thumbnail']]
        if with_both:
            print(f"\n✅ Sample events WITH thumbnails:")
            for event_id in with_both[:5]:
                files = ", ".join(events[event_id]['files'])
                print(f"   - {event_id}: {files}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    scan_events()