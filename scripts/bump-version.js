#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '../package.json');
const appPath = path.join(__dirname, '../app.json');

// Read current files
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const appJson = JSON.parse(fs.readFileSync(appPath, 'utf8'));

const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Get version argument
const versionArg = process.argv[2];

let newVersion;

if (!versionArg) {
  // No argument: bump patch
  newVersion = `${major}.${minor}.${patch + 1}`;
} else {
  const parts = versionArg.split('.');
  
  if (parts.length === 1) {
    // Single number: set major, reset minor and patch
    newVersion = `${parts[0]}.0.0`;
  } else if (parts.length === 2) {
    // Two numbers: set major.minor, reset patch
    newVersion = `${parts[0]}.${parts[1]}.0`;
  } else if (parts.length === 3) {
    // Three numbers: explicit version
    newVersion = versionArg;
  } else {
    console.error('Invalid version format. Use: <major>, <major>.<minor>, or <major>.<minor>.<patch>');
    process.exit(1);
  }
}

console.log(`Bumping version from ${currentVersion} to ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

// Update app.json
appJson.expo.version = newVersion;
appJson.expo.runtimeVersion = newVersion;
fs.writeFileSync(appPath, JSON.stringify(appJson, null, 2) + '\n');

console.log('✅ Version updated in package.json and app.json');
