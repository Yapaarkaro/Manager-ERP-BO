const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure resolver to handle web platform properly
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Configure blockList based on platform
if (process.env.EXPO_PLATFORM === 'web') {
  // Only block react-native-maps on web platform
  config.resolver.blockList = [
    /node_modules\/react-native-maps\/lib\/.*\.(js|jsx|ts|tsx)$/
  ];
}

// Add custom resolver to handle platform-specific imports
config.resolver.resolverMainFields = ['browser', 'main', 'react-native'];

module.exports = config;
