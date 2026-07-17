/**
 * Vercel Serverless Function: POST /api/sendPhoto
 * 
 * Receives multipart form data (photo + chat_id + caption)
 * and forwards it to the Telegram Bot API.
 * The bot token is stored as an environment variable — never exposed to clients.
 */

import fetch from 'node-fetch';
import FormData from 'form-data';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_CHAT_ID = process.env.DEFAULT_CHAT_ID || '';
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '30', 10);

const ipCounts = new Map();

function getClientIP(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

function checkRateLimit(ip) {
  const now = Math.floor(Date.now() / 60000);
  const key = ip + ':' + now;
  const count = (ipCounts.get(key) || 0) + 1;
  ipCounts.set(key, count);
  if (ipCounts.size > 1000) {
    for (const [k] of ipCounts) { if (k !== key) ipCounts.delete(k); }
  }
  return count <= RATE_LIMIT;
}

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // Rate limiting
  if (!checkRateLimit(getClientIP(req))) {
    return res.status(429).json({ ok: false, error: 'Rate limit exceeded. Try again later.' });
  }

  // Validate bot token
  if (!BOT_TOKEN) {
    return res.status(500).json({ ok: false, error: 'Server configuration error: TELEGRAM_BOT_TOKEN is not set.' });
  }

  try {
    // Parse multipart form data
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ ok: false, error: 'Content-Type must be multipart/form-data' });
    }

    // Read raw body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);

    // Extract boundary
    const boundary = contentType.split('boundary=')[1]?.trim();
    if (!boundary) return res.status(400).json({ ok: false, error: 'Missing boundary in Content-Type' });

    // Parse multipart parts
    const parts = rawBody.toString('binary').split('--' + boundary);
    let chatId = '';
    let caption = '';
    let fileBuffer = null;
    let fileName = 'photo.jpg';
    let fileType = 'image/jpeg';

    for (const part of parts) {
      if (part.trim() === '' || part.trim() === '--') continue;
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      const headerSection = part.substring(0, headerEnd);
      const nameMatch = headerSection.match(/name="([^"]+)"/);
      if (!nameMatch) continue;
      const fieldName = nameMatch[1];
      const filenameMatch = headerSection.match(/filename="([^"]+)"/);

      if (filenameMatch) {
        // This is a file field
        const ctMatch = headerSection.match(/Content-Type:\s*([^\r\n]+)/i);
        fileType = ctMatch ? ctMatch[1].trim() : 'image/jpeg';
        fileName = filenameMatch[1];
        const binaryStart = headerEnd + 4;
        const binaryEnd = part.lastIndexOf('\r\n--');
        const binaryPart = part.substring(binaryStart, binaryEnd !== -1 ? binaryEnd : part.length);
        fileBuffer = Buffer.from(binaryPart, 'binary');
      } else {
        // This is a text field
        const value = part.substring(headerEnd + 4).replace(/\r\n--$/, '').replace(/\r\n$/, '').trim();
        if (fieldName === 'chat_id') chatId = value;
        if (fieldName === 'caption') caption = value;
      }
    }

    // Validate required fields
    chatId = chatId || DEFAULT_CHAT_ID;
    if (!chatId) return res.status(400).json({ ok: false, error: 'chat_id is required' });
    if (!fileBuffer) return res.status(400).json({ ok: false, error: 'photo file is required' });
    if (fileBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ ok: false, error: 'Photo exceeds 10MB limit' });
    }

    // Build FormData for Telegram API
    const tgForm = new FormData();
    tgForm.append('chat_id', chatId);
    tgForm.append('photo', fileBuffer, { filename: fileName, contentType: fileType });
    if (caption) {
      tgForm.append('caption', caption.substring(0, 1024));
      tgForm.append('parse_mode', 'Markdown');
    }

    // Send to Telegram
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: tgForm,
      headers: tgForm.getHeaders(),
    });

    const tgResult = await tgRes.json();
    if (!tgResult.ok) {
      console.error('Telegram API error (sendPhoto):', JSON.stringify(tgResult));
    }

    return res.status(tgRes.status).json(tgResult);

  } catch (error) {
    console.error('sendPhoto internal error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error: ' + error.message });
  }
}
