#!/usr/bin/env python3
"""
Quick script to check if thumbnails exist in Firebase Storage
"""

import firebase_admin
from firebase_admin import credentials, storage
import sys

def check_thumbnail_exists():
    try:
        # Initialize Firebase if not already done
        if not firebase_admin._apps:
            cred = credentials.Certificate('./serviceAccountKey.json')
            firebase_admin.initialize_app(cred, {
                'storageBucket': 'hash-836eb.appspot.com'
            })
        
        bucket = storage.bucket()
        
        # Check for the specific thumbnail that was supposedly uploaded
        event_id = "h80MO3jjS0Oihzx66L2r"
        collection = "bayAreaEvents"
        
        # Check different possible paths
        possible_paths = [
            f"{collection}/{event_id}/event_thumbnail.png",
            f"{collection}/{event_id}/event_thumbnail.jpg",
        ]
        
        print(f"🔍 Checking thumbnails for {collection}/{event_id}...")
        
        for path in possible_paths:
            blob = bucket.blob(path)
            exists = blob.exists()
            print(f"   {path}: {'✅ EXISTS' if exists else '❌ NOT FOUND'}")
            
            if exists:
                # Get file info
                blob.reload()
                print(f"      Size: {blob.size} bytes")
                print(f"      Content-Type: {blob.content_type}")
                print(f"      Created: {blob.time_created}")
        
        # Also check what files DO exist for this event
        print(f"\n📁 All files for {collection}/{event_id}/:")
        blobs = bucket.list_blobs(prefix=f"{collection}/{event_id}/")
        
        found_files = list(blobs)
        if found_files:
            for blob in found_files:
                print(f"   ✅ {blob.name} ({blob.size} bytes, {blob.content_type})")
        else:
            print("   ❌ No files found")
            
        # Let's also check if there are ANY events needing thumbnails
        print(f"\n🔍 Scanning {collection} for events needing thumbnails...")
        
        all_blobs = bucket.list_blobs(prefix=f"{collection}/")
        events = {}
        
        for blob in all_blobs:
            path_parts = blob.name.split('/')
            if len(path_parts) >= 3:
                event_id_found = path_parts[1]
                filename = path_parts[2]
                
                if event_id_found not in events:
                    events[event_id_found] = {'has_image': False, 'has_thumbnail': False}
                
                if filename in ['event_image.png', 'event_image.jpg']:
                    events[event_id_found]['has_image'] = True
                elif filename in ['event_thumbnail.png', 'event_thumbnail.jpg']:
                    events[event_id_found]['has_thumbnail'] = True
        
        # Count events needing thumbnails
        needs_thumbnails = []
        for event_id, files in events.items():
            if files['has_image'] and not files['has_thumbnail']:
                needs_thumbnails.append(event_id)
        
        print(f"📊 Events with images: {len([e for e in events.values() if e['has_image']])}")
        print(f"📊 Events with thumbnails: {len([e for e in events.values() if e['has_thumbnail']])}")
        print(f"📊 Events needing thumbnails: {len(needs_thumbnails)}")
        
        if needs_thumbnails:
            print("🎯 Events needing thumbnails:")
            for event_id in needs_thumbnails[:10]:  # Show first 10
                print(f"   - {event_id}")
            if len(needs_thumbnails) > 10:
                print(f"   ... and {len(needs_thumbnails) - 10} more")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_thumbnail_exists()