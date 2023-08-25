const express = require('express');
const axios = require('axios');
const path = require('path');
const { Telegraf } = require('telegraf');
require('dotenv').config();

const expressApp = express();
const port = process.env.PORT || 3000;

expressApp.use(express.static('static'));
expressApp.use(express.json());

const bot = new Telegraf(process.env.BOT_TOKEN);

expressApp.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'));
});

bot.launch();

const userAlerts = {
  ethereum: {},
  bitcoin: {},
  tether: {},
};

bot.command('start', ctx => {
  console.log(ctx.from);
  bot.telegram.sendMessage(ctx.chat.id, 'Hello there! Welcome to the Taweret Montu bot.\nI respond to cryptocurrency prices. Cool features to try out with me', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Set Price Alert', callback_data: 'setalert' }
        ],
        [
          { text: 'Ethereum', callback_data: 'ethereum_alert' },
          { text: 'Bitcoin', callback_data: 'bitcoin_alert' },
          { text: 'USDT', callback_data: 'usdt_alert' },
        ]
      ]
    }
  });
});

bot.action('setalert', ctx => {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Ethereum', callback_data: 'ethereum_alert' }],
          [{ text: 'Bitcoin', callback_data: 'bitcoin_alert' }],
          [{ text: 'USDT', callback_data: 'usdt_alert' }]
        ]
      }
    };
  
    ctx.reply("Please select a cryptocurrency to set an alert for:", options);
  });
  

bot.action('ethereum_alert', ctx => {
    axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      .then(response => {
        const currentPrice = response.data.ethereum.usd;
        ctx.reply(`Current Ethereum price is ${currentPrice} USD.\nPlease enter the target price you'd like to be alerted for (in USD).`);
        bot.on('text', alertHandler(ctx.from.id, 'ethereum'));
      })
      .catch(error => {
        console.error('Error fetching Ethereum price:', error);
        ctx.reply('Sorry, there was an error fetching the Ethereum price.');
      });
  });
  

bot.action('bitcoin_alert', ctx => {
    axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      .then(response => {
        const currentPrice = response.data.bitcoin.usd;
        ctx.reply(`Current Bitcoin price is ${currentPrice} USD.\nPlease enter the target price you'd like to be alerted for (in USD).`);
        bot.on('text', alertHandler(ctx.from.id, 'bitcoin'));
      })
      .catch(error => {
        console.error('Error fetching Bitcoin price:', error);
        ctx.reply('Sorry, there was an error fetching the Bitcoin price.');
      });
});

bot.action('usdt_alert', ctx => {
    axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
      .then(response => {
        const currentPrice = response.data.usdt.usd;
        ctx.reply(`Current USDT price is ${currentPrice} USD.\nPlease enter the target price you'd like to be alerted for (in USD).`);
        bot.on('text', alertHandler(ctx.from.id, 'usdt'));
      })
      .catch(error => {
        console.error('Error fetching USDT price:', error);
        ctx.reply('Sorry, there was an error fetching the USDT price.');
      });
});

function alertHandler(userId, cryptocurrency) {
  return async ctx => {
    const targetPrice = parseFloat(ctx.message.text);
    if (!isNaN(targetPrice)) {
      userAlerts[cryptocurrency][userId] = targetPrice;
      ctx.reply(`Alert set! You will be notified if ${cryptocurrency.toUpperCase()} price crosses ${targetPrice} USD.`);
    } else {
      ctx.reply('Invalid input. Please enter a valid number.');
    }
    bot.off('text', alertHandler(userId, cryptocurrency)); // Remove the listener
  };
}

setInterval(() => {
  axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,tether&vs_currencies=usd')
    .then(response => {
      const prices = response.data;
      for (const cryptocurrency in userAlerts) {
        for (const userId in userAlerts[cryptocurrency]) {
          const currentPrice = prices[cryptocurrency].usd;
          const targetPrice = userAlerts[cryptocurrency][userId];
          if (currentPrice >= targetPrice) {
            bot.telegram.sendMessage(userId, `${cryptocurrency.toUpperCase()} price is now ${currentPrice} USD. It has crossed your target of ${targetPrice} USD.`);
          }
        }
      }
    })
    .catch(error => {
      console.error('Error fetching prices:', error);
    });
}, 300000); // Run every 5 minutes

expressApp.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
