const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Evita que Metro bundlee los plugins nativos de Node
config.resolver.blockList = [
    /@rnmapbox\/maps\/plugin\/.*/,
];

module.exports = config;