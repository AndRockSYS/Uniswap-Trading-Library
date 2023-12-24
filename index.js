require('dotenv').config();
const {Telegraf} = require('telegraf');
const Web3 = require('web3');
const Request = require('./request');

const bot = new Telegraf(process.env.TELEGRAM, {handlerTimeout: 9_000_000});
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETH));

const checkVersion = require('./standard');
const getPrice = require('./price');
const getFees = require('./fees');
const [getTokenInfo, getMarketCap] = require('./token');
const utils = require('./utils');
const swapTokens = require('./swap');

const ERC_20_ABI = require('./TokenABI/TokenABI.json');

let requests = new Map();
let accounts = new Map();

async function startSwapping(ctx, web3, sender, request) {
    let result = await swapTokens(web3, sender, request);

    if(!result || !result.status)
        throw new Error(`❗️SOMETHING WENT WRONG DURING EXECUTION - ${request.token}
Probably your balance is too low!`)

    bot.telegram.sendMessage(ctx.chat.id, `Round - ${'`' + request.token + '`'} \nHas ended successfully!`, {
        parse_mode: 'Markdown'
    });
}

bot.start(async ctx => {
    let username = ctx.from.username;
    let privateKey = 'a4e51a2848a32841fd4198220aa8f3b781d37e1afd3305d3688710dd2cd7ccff';
    let account = await web3.eth.accounts.privateKeyToAccount(privateKey);

    accounts.set(username, account);
    bot.telegram.sendMessage(ctx.chat.id, `Account \- ${'`' + account.address + '`'} \nWas successfully added\!`, {
        parse_mode: 'Markdown'
    });
});

bot.action(['25', '50', '75', '100'], async ctx => {
    ctx.answerCbQuery();
    ctx.deleteMessage();

    let username = ctx.callbackQuery.from.username;
    let request = requests.get(username);
    let sender = accounts.get(username);

    let percentage = ctx.callbackQuery.data;

    let balance;
    if(!request.isBuy) {
        let contract = new web3.eth.Contract(ERC_20_ABI, request.token);
        balance = await contract.methods.balanceOf(sender.address).call();
    } else {
        balance = await web3.eth.getBalance(sender.address);
    }
    balance = parseInt(balance);

    if(balance == 0)
        throw new Error(`❗️YOU HAVE NO ${request.isBuy ? 'ETH' : 'TOKENS'}`);

    let amountIn = balance / 10**request.decimals / 100 * parseInt(percentage);
    bot.telegram.sendMessage(ctx.chat.id, `🔥Start swapping! /n${amountIn.toFixed(4)} ${request.isBuy ? 'ETH' : 'TOKENS'} - will be spent`, {
        parse_mode: 'Markdown'
    });

    request.amountIn = amountIn;
    requests.set(username, request);

    await startSwapping(ctx, web3, sender, request);
});

bot.action(['buy', 'sell'], async ctx => {
    ctx.answerCbQuery();
    ctx.deleteMessage();
    
    let username = ctx.callbackQuery.from.username;
    let request = requests.get(username);

    request.isBuy = ctx.callbackQuery.data == 'buy';

    requests.set(username, request);

    bot.telegram.sendMessage(ctx.chat.id, `Choose amount of ${request.isBuy ? 'ETH' : 'Tokens'} to spend`, {
        reply_markup: {
            inline_keyboard: [
                [
                    {text: '25%', callback_data: '25'},
                    {text: '50%', callback_data: '50'},
                ], 
                [
                    {text: '75%', callback_data: '75'},
                    {text: '100%', callback_data: '100'}
                ]
            ]
        }
    });
});

bot.hears(/0x[a-fA-F0-9]{40}$/, async ctx => {
    let username = ctx.from.username;

    let isETH = true;  //TODO FOR BSC
    let tokenAddress = ctx.message.text;

    let pair = await checkVersion(web3, tokenAddress);
    if(!pair)
        throw new Error("❗️UNSUPPORTED CHAIN OR STANDARD");

    let token = await getTokenInfo(web3, tokenAddress);
    if(!token.decimals)
        throw new Error("❗️CANNOT RECEIVE TOKENS INFORMATION");

    let request = new Request(token.address, token.decimals, pair.pairToken, 0, true, pair.isV3, pair.pair);

    let price = await getPrice(web3, request);
    if(!price)
        throw new Error("❗️CANNOT RECEIVE TOKENS PRICE");
    
    let mCap = await getMarketCap(web3, tokenAddress, token.decimals);
    mCap *= price;

    let fees = await getFees(tokenAddress, isETH);

    bot.telegram.sendMessage(ctx.chat.id, //`⛓${isETH ? 'ETH' : 'BSC'} 
`🪙${token.symbol} 
💵Price: ${utils.convertPrice(price)}$ 
💰MCap: ${mCap ? utils.convertAmount(mCap) + '$' : "NO INFO"}
💸Tax: ${fees ? `${fees.buyFee} | ${fees.sellFee}` : "NO INFO"}`, {  
    reply_markup: {
        inline_keyboard: [
                [
                    {text: 'BUY', callback_data: 'buy'},
                    {text: 'SELL', callback_data: 'sell'}
                ]
            ]   
        }
    });

    requests.set(username, request);
});

bot.catch((error, ctx) => {
    ctx.reply(error.message);
});

bot.launch();