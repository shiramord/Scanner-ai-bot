require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { AffiliateClient } = require('ae_sdk');

const token = process.env.BOT_TOKEN;
const APP_KEY = process.env.ALI_APP_KEY;
const APP_SECRET = process.env.ALI_APP_SECRET;
const TRACKING_ID = process.env.ALI_TRACKING_ID || 'default';

const bot = new TelegramBot(token, { polling: true });

// ✅ Official AliExpress SDK client
const aliClient = new AffiliateClient({
  app_key: APP_KEY,
  app_secret: APP_SECRET,
  session: '',
});

// ─── ALIEXPRESS SEARCH ───────────────────────────────────
async function searchAliExpressProducts(keyword) {
  try {
    const response = await aliClient.queryProducts({
      keywords: keyword,
      page_size: 4,
      sort: 'SALE_PRICE_ASC',
      tracking_id: TRACKING_ID,
      target_currency: 'USD',
      target_language: 'EN',
      ship_to_country: 'IL',
    });

    console.log('AliExpress response:', JSON.stringify(response, null, 2));

    if (response.ok) {
      const result = response.data?.aliexpress_affiliate_product_query_response?.resp_result;
      return result?.result?.products?.product || [];
    } else {
      console.error('AliExpress error:', response.message, response.error_response);
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
  const orders = product.lastest_volume ? Number(product.lastest_volume).toLocaleString() : '0';
  const url = product.promotion_link || product.product_detail_url || '#';
  return (
    `${index}️⃣ *${name}*\n` +
    `💰 מחיר: ${price}\n` +
    `⭐ דירוג: ${rating}\n` +
    `🛒 הזמנות: ${orders}\n` +
    `🔗 [קנה באליאקספרס](${url})\n`
  );
}

// ─── BOT MESSAGE HANDLER ─────────────────────────────────
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
    const keyword = text.replace(/מחפש|חפש|חיפוש|מצא|רוצה/g, '').trim();

    if (!keyword) {
      bot.sendMessage(chatId, '❓ מה תרצה לחפש? לדוגמה: *חפש אוזניות סמסונג*', { parse_mode: 'Markdown' });
      return;
    }

    console.log(`Searching for: ${keyword}`);
    await bot.sendMessage(chatId, `🔍 מחפש לך *${keyword}*...`, { parse_mode: 'Markdown' });

    const products = await searchAliExpressProducts(keyword);
    console.log(`Found ${products.length} products`);

    if (!products.length) {
      bot.sendMessage(chatId, '😕 לא מצאתי תוצאות. נסה מילות חיפוש אחרות.');
      return;
    }

    const header = `🛍️ *מצאתי ${products.length} מוצרים עבור "${keyword}":*\n\n`;
    const body = products.slice(0, 4).map((p, i) => formatProduct(p, i + 1)).join('\n─────────────────\n\n');
    const footer = '\n\n✅ _כל הקישורים הם קישורי שותפים_';

    bot.sendMessage(chatId, header + body + footer, {
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
    });
  }
});

console.log('🤖 Bot is running...');
