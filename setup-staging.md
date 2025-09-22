# Firebase Staging Environment Setup

## Step 1: Create New Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it: `hash-staging-secure` (or similar)
4. Follow setup wizard
5. Copy the new Project ID

## Step 2: Add Staging to Local Config

Once you have the Project ID, run:
```bash
firebase use --add
# Select your new staging project
# Give it alias: "staging"
```

## Step 3: Deploy to Staging

```bash
# Switch to staging
firebase use staging

# Deploy everything to staging
firebase deploy

# Your staging URL will be: https://your-staging-project-id.web.app
```

## Step 4: Test Different URLs

Once staging is deployed, you can test:
- https://your-staging-project-id.web.app (clean URL)
- https://your-staging-project-id.firebaseapp.com (old format)

## Step 5: Switch Back to Production

```bash
firebase use dev  # switches back to production
```

## Rollback Plan

If something goes wrong:
1. `firebase use dev` (back to production)
2. Your production site remains untouched
3. Delete staging project if needed