/**
 * Vercel Serverless Function: POST /api/sendMessage
 * 
 * Receives text messages (multipart/form-data, JSON, or URL-encoded)
 * and forwards them to the Telegram Bot API.
 */

import fetch from 'node-fetch';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  if (!checkRateLimit(getClientIP(req))) {
    return res.status(429).json({ ok: false, error: 'Rate limit exceeded' });
  }

  if (!BOT_TOKEN) {
    return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || '';

    let chatId = '';
    let text = '';
    let parseMode = '';

    // Parse based on content type
    if (contentType.includes('multipart/form-data')) {
      const boundary = contentType.split('boundary=')[1]?.trim();
      if (!boundary) return res.status(400).json({ ok: false, error: 'Missing boundary' });
      const parts = rawBody.toString('binary').split('--' + boundary);
      for (const part of parts) {
        if (part.trim() === '' || part.trim() === '--') continue;
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;
        const nameMatch = part.substring(0, headerEnd).match(/name="([^"]+)"/);
        if (!nameMatch) continue;
        const value = part.substring(headerEnd + 4).replace(/\r\n--$/, '').replace(/\r\n$/, '').trim();
        if (nameMatch[1] === 'chat_id') chatId = value;
        if (nameMatch[1] === 'text') text = value;
        if (nameMatch[1] === 'parse_mode') parseMode = value;
      }
    } else if (contentType.includes('application/json')) {
      const body = JSON.parse(rawBody.toString('utf-8'));
      chatId = body.chat_id;
      text = body.text;
      parseMode = body.parse_mode;
    } else {
      const params = new URLSearchParams(rawBody.toString('utf-8'));
      chatId = params.get('chat_id');
      text = params.get('text');
      parseMode = params.get('parse_mode');
    }

    // Validate
    chatId = chatId || DEFAULT_CHAT_ID;
    if (!chatId) return res.status(400).json({ ok: false, error: 'chat_id is required' });
    text = text?.trim();
    if (!text) return res.status(400).json({ ok: false, error: 'text is required' });

    // Truncate to Telegram's 4096 character limit
    if (text.length > 4096) {
      text = text.substring(0, 4080) + '\n\n… (truncated)';
    }

    // Send to Telegram
    const params = new URLSearchParams();
    params.append('chat_id', chatId);
    params.append('text', text);
    if (parseMode) params.append('parse_mode', parseMode);

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const tgResult = await tgRes.json();
    if (!tgResult.ok) {
      console.error('Telegram API error (sendMessage):', JSON.stringify(tgResult));
    }

    return res.status(tgRes.status).json(tgResult);

  } catch (error) {
    console.error('sendMessage internal error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error: ' + error.message });
  }
}
