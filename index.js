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

    const result =
      response.data?.aliexpress_affiliate_product_query_response?.resp_result;

    if (result?.resp_code === 200) {
      return result.result.products.product || [];
    } else {
      console.error('AliExpress error:', result);
      return [];
    }
  } catch (err) {
    console.error('Request failed:', err.message);
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
      text.includes('מצא') ||
      text.includes('רוצה'))
  ) {
    // Extract keyword by removing trigger words
    const keyword = text
      .replace(/מחפש|חפש|חיפוש|מצא|רוצה/g, '')
      .trim();

    if (!keyword) {
      bot.sendMessage(chatId, '❓ מה תרצה לחפש? לדוגמה: *חפש אוזניות סמסונג*', {
        parse_mode: 'Markdown',
      });
      return;
    }

    // Immediate response
    await bot.sendMessage(chatId, `🔍 מחפש לך *${keyword}*...`, {
      parse_mode: 'Markdown',
    });

    // Call AliExpress API
    const products = await searchAliExpressProducts(keyword);

    if (!products.length) {
      bot.sendMessage(chatId, '😕 לא מצאתי תוצאות. נסה מילות חיפוש אחרות.');
      return;
    }

    // Build message
    const header = `🛍️ *מצאתי ${products.length} מוצרים עבור "${keyword}":*\n\n`;
    const body = products
      .slice(0, 4)
      .map((p, i) => formatProduct(p, i + 1))
      .join('\n─────────────────\n\n');
    const footer = '\n\n✅ _כל הקישורים הם קישורי שותפים_';

    bot.sendMessage(chatId, header + body + footer, {
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
    });
  }
});

console.log('🤖 Bot is running...');
