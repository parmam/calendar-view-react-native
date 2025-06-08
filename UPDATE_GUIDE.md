# Detailed Guide: OTA Update System for Calendar View App

## Introduction

This document provides detailed information about the implementation, configuration, and use of the Over-The-Air (OTA) update system implemented in the Calendar View application. The system uses Expo's EAS Update to provide code updates without needing to submit new versions to app stores.

## Technical Configuration

### 1. Configuration Files

#### app.json

```json
{
  "expo": {
    "version": "1.0.1",
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/f7b3f737-5457-4650-bc8a-996fd5fed4e0",
      "enabled": true,
      "fallbackToCacheTimeout": 0,
      "checkAutomatically": "ON_LOAD"
    }
  }
}
```

#### eas.json

```json
{
  "cli": {
    "version": ">= 16.7.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "staging": {
      "distribution": "internal",
      "channel": "staging"
    },
    "production": {
      "channel": "production"
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 2. Required Dependencies

```json
{
  "dependencies": {
    "expo-updates": "~0.28.14",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "expo-constants": "~15.4.5"
  }
}
```

### 3. Code Implementation

The update system is implemented in `App.tsx` with the following features:

- Dynamic retrieval of the application version from app.json
- Automatic update verification when starting the application
- Periodic verification every 30 minutes
- Option for manual or automatic updates
- Update history logging
- Recovery system in case of errors
- Persistence of update preferences

#### Dynamic version retrieval

```typescript
// Import Constants to get the version
import Constants from 'expo-constants';

// In the App component
const appVersion = Constants.expoConfig?.version || '1.0.0';
```

This implementation allows the application version to be automatically obtained from the app.json file, without the need to maintain a static string in the code.

## Workflow for Implementing Updates

### 1. Local Development

During development, work normally in your local environment:

```bash
npm start
# or
expo start
```

### 2. Testing in Staging

When you're ready to test an update:

```bash
# Increase the version in app.json if necessary
# Then publish the update to staging
eas update --channel staging --message "Description of change"
```

This will allow test devices to receive the update.

### 3. Deployment to Production

Once the update has been tested in staging:

```bash
# Publish the update to production
eas update --channel production --message "Description of change"
```

## Advanced Strategies

### 1. Progressive Rollouts

To implement updates gradually:

```bash
# Deploy to 20% of users
eas update --channel production --message "New feature X" --rollout-percentage 20

# After verifying there are no issues, complete the rollout
eas update:rollout --id <UPDATE-ID> --percentage 100
```

### 2. Rollbacks

If a problem is detected with an update:

```bash
# Identify previous stable update
eas update:list

# Create branch from stable version
eas branch:create rollback-$(date +%Y%m%d) --from <STABLE-COMMIT>

# Publish rollback update
eas update --branch rollback-$(date +%Y%m%d) --message "Rollback to stable version" --channel production
```

### 3. Branch Management

To work with different features in parallel:

```bash
# Create branch for feature
eas branch:create feature-x

# Publish update to specific branch
eas update --branch feature-x --message "Feature X implementation"

# Merge updates to production
eas update --branch main --auto-track feature-x --message "Merge feature X"
```

## Update Monitoring

The application implements a monitoring system that:

1. Logs each update attempt
2. Saves information about update success/failure
3. Provides recovery options in case of failures
4. Maintains a history for diagnosis

## Best Practices

1. **Versioning**: Increment the version in `app.json` following the SemVer standard for each significant update
2. **Descriptive messages**: Use clear messages when publishing updates
3. **Thorough testing**: Test on multiple devices before sending to production
4. **Post-deployment monitoring**: Monitor metrics and feedback after each update
5. **Separate channels**: Keep development, staging, and production channels separate

## Troubleshooting Common Issues

### The update doesn't appear on the device

1. Verify that the device is connected to the internet
2. Check that the app version matches the `runtimeVersion` policy
3. Verify that the publishing channel matches the build profile

### Error during update

The application includes a recovery system that:

1. Detects critical errors during the update
2. Offers the user the option to restart the application
3. Cleans the update cache if necessary

### Conflicts between native and JS versions

If there are changes that require a native update:

1. Increment the version in `app.json`
2. Perform a new native build with `eas build`
3. Submit to app stores

## Reference Commands

```bash
# View list of updates
eas update:list

# View details of an update
eas update:view <UPDATE-ID>

# Publish update to multiple channels
eas update --channel production,staging --message "Description of change"

# Create a release version with a specific message
eas update --channel production --message "[v1.0.1] Calendar bug fixes"
```

## Security Considerations

1. **Access control**: Limit who can publish updates
2. **Integrity verification**: Updates are cryptographically verified
3. **Backups**: Maintain backups of stable versions
4. **Recovery strategy**: Implement automated rollback system

---

This documentation should be updated when significant changes are made to the update system.

Last update: [Current date]
