const TelegramApi = require('node-telegram-bot-api')
const {gameOptions, againOptions} = require('./options')
const sequelize = require('./db');
const UserModel = require('./models');

const token = ''

const bot = new TelegramApi(token, {polling: true})

const chats = {}


const startGame = async (chatId) => {
    await bot.sendMessage(chatId, 'Now I will think of a number from 0 to 9, and you have to guess it!');
    const randomNumber = Math.floor(Math.random() * 10)
    chats[chatId] = randomNumber;
    await bot.sendMessage(chatId, 'Guess', gameOptions);
}

const start = async () => {

    try {
        await sequelize.authenticate()
        await sequelize.sync()
    } catch (e) {
        console.log('DB connection broken', e)
    }

    bot.setMyCommands([
        {command: '/start', description: 'Initial greeting'},
        {command: '/info', description: 'Get user information'},
        {command: '/game', description: 'Guess the number game'},
    ])

    bot.on('message', async msg => {
        const text = msg.text;
        const chatId = msg.chat.id;

        try {
            if (text === '/start') {
                await UserModel.create({chatId})
                await bot.sendSticker(chatId, '')
                return bot.sendMessage(chatId, 'Welcome to telegram bot');
            }
            if (text === '/info') {
                const user = await UserModel.findOne({chatId})
                return bot.sendMessage(chatId, `Your name ${msg.from.first_name} ${msg.from.last_name}, in the game you have the correct answers ${user.right}, wrong ${user.wrong}`);
            }
            if (text === '/game') {
                return startGame(chatId);
            }
            return bot.sendMessage(chatId, "I don't understand you, try again!)");
        } catch (e) {
            return bot.sendMessage(chatId, 'Some error has occurred!)');
        }

    })

    bot.on('callback_query', async msg => {
        const data = msg.data;
        const chatId = msg.message.chat.id;
        if (data === '/again') {
            return startGame(chatId)
        }
        const user = await UserModel.findOne({chatId})
        if (data == chats[chatId]) {
            user.right += 1;
            await bot.sendMessage(chatId, `Congratulations, you guessed the number ${chats[chatId]}`, againOptions);
        } else {
            user.wrong += 1;
            await bot.sendMessage(chatId, `Unfortunately you did not guess, the bot guessed the number ${chats[chatId]}`, againOptions);
        }
        await user.save();
    })
}

start()
