const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text && text.includes("מחפש")) {
        bot.sendMessage(chatId, "🔍 מחפש לך מוצרים...");
        
        bot.sendMessage(chatId, `
🔎 מצאתי לך 3 אופציות:

1. מנורת לילה לילדים  
⭐ 4.8 | 🛒 12,000 הזמנות  
💰 $8.90  
🔗 לינק

2. מנורת ירח LED  
⭐ 4.7 | 🛒 8,500 הזמנות  
💰 $10.50  
🔗 לינק

3. מנורת חיות חמודה  
⭐ 4.9 | 🛒 15,000 הזמנות  
💰 $9.20  
🔗 לינק
        `);
    } else {
        bot.sendMessage(chatId, "תכתבי 'מחפש: ...' ואני אמצא לך מוצרים 😄");
    }
});
