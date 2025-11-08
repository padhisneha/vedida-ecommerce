const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve react from mobile's node_modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Ensure react and react-native are resolved from mobile's node_modules
  if (moduleName === 'react' || moduleName === 'react-native') {
    return context.resolveRequest(
      context,
      moduleName,
      platform
    );
  }

  // Otherwise, use default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;