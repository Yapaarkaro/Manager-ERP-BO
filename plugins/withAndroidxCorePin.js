const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * androidx.core 1.17+ declares AAR metadata requiring compileSdk 36 and AGP 8.9.1+.
 * Expo SDK 53 / RN 0.79 prebuild still uses compileSdk 35 and AGP 8.8.2, so
 * :app:checkReleaseAarMetadata fails on EAS. Pin core artifacts to 1.16.x instead.
 */
function withAndroidxCorePin(config) {
  return withProjectBuildGradle(config, (config) => {
    const marker = '// withAndroidxCorePin';
    if (config.modResults.contents.includes(marker)) {
      return config;
    }

    config.modResults.contents += `
${marker}
subprojects { subproject ->
  subproject.configurations.configureEach {
    resolutionStrategy {
      force "androidx.core:core:1.16.0"
      force "androidx.core:core-ktx:1.16.0"
    }
  }
}
`;

    return config;
  });
}

module.exports = withAndroidxCorePin;
