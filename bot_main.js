var external_path = '../Re_Dive_BOT/';
//引入
const publicFunction = require('./public_function.js');
const botMainFunction = require('./bot_main_function.js');
const Discord = require('discord.js');
const init = require(external_path + 'auth.json');
const bot_info = require(external_path + 'bot_control_info.json');
const public_function = new publicFunction();
const bot_main_function = new botMainFunction();
public_function.dateFormat();

//var is_int = /^[0-9]+$/;
//var is_ds_id = /^[0-9]{18,18}$/;

var bot = new Discord.Client();
bot.login(bot_info.main_bot_token);

bot.on("ready", function () {
    console.log('Discord Main BOT Ready');

    bot.on("message", async function (data) {

        try {
            var message = data.content;
            var user = data.author.username;
            var userID = data.author.id;
            var channelID = data.channel.id;

            //檢查訊息是否有帶入指定符號
            if (message.substring(0, 2) == '!!') {
                //用空白拆解訊息
                let args = message.substring(2).split(' ');
                //取得第一字組文字
                let keyword = args[0].replace(/\s+/g, "");
                //取得第二組文字
                let message_str = message.substring(2).substring((keyword.length + 2) - 1);

                switch (keyword) {
                    case 'reset':
                        await bot_main_function.resetDamageExcel();

                        public_function.sendMessage(data, '傷害表已重置完畢');
                        break;

                    case 'reset_start':

                        let parameter = message_str.split(' ');

                        await bot_main_function.damageActivityStart(parameter[0], parameter[1], parameter[2]);

                        public_function.sendMessage(data, '傷害表已重置並更新下次開戰日期');
                        break;

                    default:
                        public_function.sendMessage(data, '查無指令');
                }
            }
        } catch (e) {
            public_function.writeErrorLog(e, init.time_difference, external_path, 'bot_main.js');
        }
    });
});