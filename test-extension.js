// Test if the extension exports are correct
try {
    const ext = require('./out/extension.js');
    console.log('Extension exports:', Object.keys(ext));
    console.log('Has activate?', typeof ext.activate === 'function');
    console.log('Has deactivate?', typeof ext.deactivate === 'function');
    
    // Try to load ServiceContainer
    try {
        const { ServiceContainer } = require('./out/core/ServiceContainer.js');
        console.log('ServiceContainer loaded successfully');
    } catch (e) {
        console.error('Failed to load ServiceContainer:', e.message);
    }
} catch (e) {
    console.error('Failed to load extension:', e.message);
    console.error(e.stack);
}