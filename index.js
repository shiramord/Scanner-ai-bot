require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const axios = require('axios');

// ─── CONFIG ─────────────────────────────────────────────
const token = process.env.BOT_TOKEN;
const APP_KEY = process.env.ALI_APP_KEY;
const APP_SECRET = process.env.ALI_APP_SECRET;
const TRACKING_ID = process.env.ALI_TRACKING_ID || 'default';
const API_URL = 'http://gw.api.taobao.com/router/rest';

const bot = new TelegramBot(token, { polling: true });

// ─── SIGN FUNCTION ───────────────────────────────────────
function signRequest(params) {
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});

  const str = Object.keys(sorted)
    .map(key => `${key}${sorted[key]}`)
    .join('');

  const toHash = `${APP_SECRET}${str}${APP_SECRET}`;
  return crypto.createHash('md5').update(toHash, 'utf8').digest('hex').toUpperCase();
}

// ─── SEARCH ALIEXPRESS ───────────────────────────────────
async function searchAliExpressProducts(keyword) {
  const timestamp = new Date()
    .toISOString()
    .replace('T', ' ')
    .replace(/\..+/, '');

  const params = {
    method: 'aliexpress.affiliate.product.query',
    app_key: APP_KEY,
    sign_method: 'md5',
    timestamp: timestamp,
    format: 'json',
    v: '2.0',
    keywords: keyword,
    page_size: '4',
    sort: 'SALE_PRICE_ASC',
    tracking_id: TRACKING_ID,
    target_currency: 'USD',
    target_language: 'EN',
    ship_to_country: 'IL',
  };

  params.sign = signRequest(params);

  try {
    const response = await axios.post(
      API_URL,
      new URLSearchParams(params).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      }
    );

    console.log('AliExpress full response:', JSON.stringify(response.data, null, 2));

    const result =
      response.data?.aliexpress_affiliate_product_query_response?.resp_result;

    if (result?.resp_code === 200) {
      return result.result.products.product || [];
    } else {
      console.error('AliExpress error full response:', JSON.stringify(response.data, null, 2));
      return [];
    }
  } catch (err) {
    console.error('Request failed:', err.message);
    console.error('Full error:', err.response?.data || err);
    return [];
  }
}

// ─── FORMAT PRODUCT ──────────────────────────────────────
function formatProduct(product, index) {
  const name = product.product_title || 'מוצר';
  const price = product.target_sale_price ? `$${product.target_sale_price}` : 'לא זמין';
  const rating = product.evaluate_rate ? `${product.evaluate_rate}%` : 'אין דירוג';
  const orders = product.lastest_volume
    ? Number(product.lastest_volume).toLocaleString()
    : '0';
  const url = product.promotion_link || product.product_detail_url || '#';

  return (
    `${index}️⃣ *${name}*\n` +
    `💰 מחיר: ${price}\n` +
    `⭐ דירוג: ${rating}\n` +
    `🛒 הזמנות: ${orders}\n` +
    `🔗 [קנה באליאקספרס](${url})\n`
  );
}

// ─── BOT LISTENER ────────────────────────────────────────
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (
    text &&
    (text.includes('מחפש') ||
      text.includes('חפש') ||
      text.includes('חיפוש') ||
      
