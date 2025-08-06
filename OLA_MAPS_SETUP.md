# Ola Maps SDK Integration Guide

## Overview
This guide explains how to integrate Ola Maps SDK into the React Native app for iOS devices. The implementation provides interactive maps with markers, location selection, and address geocoding.

## Prerequisites
- iOS 13.0 or later
- Xcode 12 or later
- React Native project with iOS support

## Setup Instructions

### 1. Install Ola Maps iOS SDK

#### Option A: Using CocoaPods
Add the following to your `ios/Podfile`:

```ruby
pod 'OlaMapsSDK', '~> 1.0.0'
```

Then run:
```bash
cd ios && pod install
```

#### Option B: Manual Installation
1. Download the Ola Maps SDK framework from the official repository
2. Add the `.xcframework` files to your iOS project
3. Embed the frameworks in your project settings

### 2. Configure Location Permissions

Add the following keys to your `ios/YourApp/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs access to location to show your current position on the map</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app needs access to location to show your current position on the map</string>
```

### 3. Native Module Files

The following files have been created:

#### `ios/OlaMapsModule.swift`
- Main Swift module that bridges Ola Maps SDK to React Native
- Handles map initialization, markers, and user interactions
- Implements OlaMapServiceDelegate for event handling

#### `ios/OlaMapsModule.m`
- Objective-C bridge header
- Exposes Swift methods to React Native

### 4. React Native Component

#### `components/OlaMapView.tsx`
- React Native component that uses the native module
- Handles map interactions and state management
- Provides a clean interface for map functionality

## Usage

### Basic Implementation

```tsx
import OlaMapView from '@/components/OlaMapView';

const MyComponent = () => {
  const handleMapClick = (lat: number, lng: number) => {
    console.log('Map clicked at:', { lat, lng });
  };

  const handleMarkerDragEnd = (lat: number, lng: number) => {
    console.log('Marker dragged to:', { lat, lng });
  };

  return (
    <OlaMapView
      initialLocation={{ lat: 28.6139, lng: 77.2090 }}
      onMapClick={handleMapClick}
      onMarkerDragEnd={handleMarkerDragEnd}
      onMapLoad={() => console.log('Map loaded')}
    />
  );
};
```

### Integration in Address Screens

The OlaMapView has been integrated into the business address screens:
- `app/auth/business-address.tsx` - Primary business address
- `app/locations/add-branch.tsx` - Branch address
- `app/locations/add-warehouse.tsx` - Warehouse address

## Features Implemented

### 1. Map Initialization
- Uses Ola Maps vector tiles for high-quality rendering
- Supports custom styling and zoom levels
- Handles map loading states

### 2. Location Selection
- Tap on map to select location
- Drag markers for precise positioning
- Current location button for quick positioning

### 3. Marker Management
- Add/remove markers dynamically
- Draggable markers with callback support
- Custom marker styling

### 4. Event Handling
- Map click events
- Marker drag events
- Map load events
- Current location updates

## Configuration

### Ola Maps Credentials
- **Project ID**: `1af22c91-1daf-4810-983b-50b95b2bd7dc`
- **API Key**: `7lWg0vFb2XZqdPXSOzseDmd4QaSSyNKf74TMC93i`
- **Tile URL**: `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json`

### Map Settings
- **Max Zoom Level**: 18.0
- **Default Zoom**: 16.0
- **Debug Logs**: Enabled
- **Current Location Button**: Enabled

## Testing

### iOS Simulator
1. Open the app in iOS Simulator
2. Navigate to any address screen
3. Verify map loads correctly
4. Test location selection and marker functionality

### Physical iOS Device
1. Build and run on physical device
2. Grant location permissions when prompted
3. Test current location functionality
4. Verify marker interactions work properly

## Troubleshooting

### Common Issues

1. **Map not loading**
   - Check internet connection
   - Verify API credentials are correct
   - Ensure Ola Maps SDK is properly installed

2. **Location permissions denied**
   - Check Info.plist configuration
   - Verify permission strings are clear
   - Test on physical device (simulator may not work)

3. **Markers not appearing**
   - Check marker coordinates are valid
   - Verify map is fully loaded before adding markers
   - Check console for error messages

### Debug Information
The implementation includes comprehensive logging:
- Map initialization status
- Marker operations
- Location updates
- Error handling

## Next Steps

### Android Implementation
Once iOS testing is complete, we can implement the Android version using:
- Ola Maps Android SDK
- Similar React Native bridge pattern
- Consistent API across platforms

### Additional Features
- Custom map styles
- Route planning
- Geofencing
- Offline map support

## Support

For issues with the Ola Maps SDK integration:
1. Check the console logs for detailed error messages
2. Verify all setup steps have been completed
3. Test with the provided sample implementation
4. Contact the development team for assistance 