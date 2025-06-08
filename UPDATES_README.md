# OTA Update System - Calendar View App

## Quick Summary

This repository includes a complete Over-The-Air (OTA) update system for Calendar View App using Expo's EAS Update.

## Initial Setup

1. **Make sure you have the necessary dependencies:**

   ```bash
   npm install @react-native-async-storage/async-storage expo-updates expo-constants
   ```

2. **Verify that app.json has the correct configuration:**

   ```json
   "version": "1.0.1",  // This version will be automatically obtained in the code
   "runtimeVersion": {
     "policy": "appVersion"
   },
   "updates": {
     "url": "https://u.expo.dev/[PROJECT-ID]",
     "enabled": true,
     "fallbackToCacheTimeout": 0,
     "checkAutomatically": "ON_LOAD"
   }
   ```

3. **Make sure eas.json has the channels configured:**
   ```json
   "build": {
     "development": {
       "channel": "development"
     },
     "staging": {
       "channel": "staging"
     },
     "production": {
       "channel": "production"
     }
   }
   ```

## System Features

- **Dynamic version retrieval**: App version is automatically obtained from app.json
- **Automatic updates**: Verification at startup and periodically
- **User preferences**: Option to update automatically or manually
- **History logging**: Tracking of applied updates
- **Error recovery**: Mechanisms to manage update failures

## How to Publish Updates

### Using the Helper Script

We have included a helper script to facilitate update operations:

```bash
# Grant execution permissions (only needed once)
chmod +x update-scripts.sh

# View help
./update-scripts.sh help

# Publish update to staging
./update-scripts.sh update:staging -m "Description of change"

# Publish update to production with progressive rollout of 20%
./update-scripts.sh update:prod -m "New feature X" -p 20

# Complete a rollout to 100% for production
./update-scripts.sh rollout:prod -i [UPDATE-ID] -p 100

# Complete a rollout to 100% for staging
./update-scripts.sh rollout:staging -i [UPDATE-ID] -p 100

# Complete a rollout to 100% for development
./update-scripts.sh rollout:dev -i [UPDATE-ID] -p 100

# Create and publish a rollback for production
./update-scripts.sh rollback:prod -i [STABLE-UPDATE-ID] -m "Rollback to stable version"

# Create and publish a rollback for staging
./update-scripts.sh rollback:staging -i [STABLE-UPDATE-ID] -m "Rollback to stable version"

# Create and publish a rollback for development
./update-scripts.sh rollback:dev -i [STABLE-UPDATE-ID] -m "Rollback to stable version"

# View status of recent updates
./update-scripts.sh status
```

### Manual Commands

If you prefer to use the commands directly:

```bash
# Publish update to development
eas update --channel development --message "Description of change"

# Publish update to staging
eas update --channel staging --message "Description of change"

# Publish update to production
eas update --channel production --message "Description of change"

# Publish with progressive rollout
eas update --channel production --message "Description of change" --rollout-percentage 20

# Complete rollout for any channel
eas update:rollout --id [UPDATE-ID] --percentage 100

# Create a rollback for any channel
# 1. Create a branch from a stable update
eas branch:create rollback-channel-name-YYYYMMDD --from [STABLE-UPDATE-ID]
# 2. Publish update from that branch to the desired channel
eas update --branch rollback-channel-name-YYYYMMDD --message "Rollback to stable version" --channel [CHANNEL-NAME]
```

## Recommended Workflow

1. **Development**:

   - Make changes to your code
   - Test locally with `npm start`

2. **Testing in Staging**:

   - Increment the version in `app.json` if necessary
   - Publish to staging: `./update-scripts.sh update:staging -m "Changes to test"`
   - Test on devices configured for the staging channel

3. **Deployment to Production**:

   - For critical changes, use progressive rollout:
     ```bash
     ./update-scripts.sh update:prod -m "[v1.0.1] New feature" -p 20
     ```
   - Monitor performance/feedback
   - Complete the rollout when you're confident:
     ```bash
     ./update-scripts.sh rollout:prod -i [UPDATE-ID] -p 100
     ```

4. **In case of issues**:
   - Identify the last stable version
   - Perform a rollback:
     ```bash
     ./update-scripts.sh rollback:prod -i [STABLE-UPDATE-ID] -m "Rollback due to issue X"
     ```
   - For development and staging environments, you can also use rollback:
     ```bash
     ./update-scripts.sh rollback:dev -i [STABLE-UPDATE-ID] -m "Rollback for development"
     ./update-scripts.sh rollback:staging -i [STABLE-UPDATE-ID] -m "Rollback for staging"
     ```

## Additional Documentation

For more detailed information about the update system, see:

- [Detailed Guide](./UPDATE_GUIDE.md) - Complete system documentation
- [Update Code](./App.tsx) - Implementation in code
- [Official EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)

## Contribution

If you find issues or improvements for the update system, please create an issue or PR in this repository.
