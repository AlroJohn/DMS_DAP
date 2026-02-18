// Configuration loader for printer client
const fs = require('fs');
const path = require('path');

// Parse .env file manually (no dependencies needed)
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const envContent = fs.readFileSync(filePath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      return;
    }
    
    // Parse KEY=VALUE
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      envVars[key] = value;
    }
  });
  
  return envVars;
}

// Load .env file
const envPath = path.join(__dirname, '.env');
const envVars = loadEnvFile(envPath);

// Merge with process.env (process.env takes precedence)
Object.keys(envVars).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = envVars[key];
  }
});

// Export configuration
module.exports = {
  // Backend URL (Cloud or Local)
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  
  // Printer authentication token
  printerToken: process.env.PRINTER_TOKEN || '',
  
  // Printer filter (to detect the correct printer)
  printerFilter: process.env.PRINTER_FILTER || 'Brother',
  
  // Debug mode
  debug: process.env.DEBUG === 'true',
  
  // Helper to check if config is ready
  isConfigured() {
    const url = this.backendUrl;
    // Check if URL has been changed from default localhost
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      console.warn('⚠️  WARNING: You are using localhost URL. For cloud deployment, please update BACKEND_URL in .env file');
      return false;
    }
    return true;
  },
  
  // Display current configuration
  display() {
    console.log('\n========================================');
    console.log('  PRINTER CLIENT CONFIGURATION');
    console.log('========================================');
    console.log(`Backend URL:     ${this.backendUrl}`);
    console.log(`Printer Filter:  ${this.printerFilter}`);
    console.log(`Authentication:  ${this.printerToken ? 'Enabled' : 'Disabled'}`);
    console.log(`Debug Mode:      ${this.debug ? 'ON' : 'OFF'}`);
    console.log('========================================\n');
  }
};
