var external_path = '../Re_Dive_BOT/';
//引入
const publicFunction = require('./public_function.js');
const botCommandBehavior = require('./BotCommandBehavior.js');
const Discord = require('discord.js');
const init = require(external_path + 'auth.json');
const bot_info = require(external_path + 'bot_control_info.json');
const public_function = new publicFunction();
const bot_command_behavior = new botCommandBehavior();
public_function.dateFormat();

//var is_int = /^[0-9]+$/;
//var is_ds_id = /^[0-9]{18,18}$/;

var bot = new Discord.Client({intents:[198656]});
bot.login(bot_info.main_bot_token);

bot.on("ready", function () {
    console.log('Discord Main BOT Ready');

    bot.on("message", async function (data) {

        try {
            var message     = data.content;
            var user        = data.author.username;
            var userID      = data.author.id;
            var channelID   = data.channel.id;
            //先記錄當下時間
            let now_date    = new Date();
            //設定時差
            now_date        = public_function.setTimezone(now_date, init.time_difference);

            //將時間往前推5小時(因為重置時間為白天5點)
            now_date.setHours(now_date.getHours() - 5);

            //檢查訊息是否有帶入指定符號
            if (message.substring(0, 2) == '!!') {
                //用空白拆解訊息
                let args = message.substring(2).split(' ');
                //取得第一組文字
                let keyword = args[0].replace(/\s+/g, "");
                //取得第二組文字
                let message_str = message.substring(2).substring((keyword.length + 2) - 1);
                let datas = [];

                let msg = '';
                let parameter = [];

                switch (keyword) {
                    /**
                     * !!update {id} {day} {damage}
                     * */
                    case 'update':
                        
                        parameter = message_str.split(' ');
                        result = null;
                        if (parameter.length == 3) {
                            let id = parameter[0];
                            let day = parameter[1];
                            let damage = parameter[2];

                            result = await bot_command_behavior.updateDamage(id, day, damage);
                        }

                        if (result != null && result.is_update) {
                            msg = '\n```diff';
                            let update_status_msg = '\n+資料已更新';
                            let analysis_msg = '';
                            let nickname = result.member_data.nickname;
                            let result_parameter = result.parameter;
                            msg += '\n暱稱:' + public_function.strFilling(nickname, 'r', 16, ' ') + '日期:' + public_function.strFilling((now_date.getMonth() + 1) + '/' + (result_parameter.day), 'r', 10, ' ') + '更新總傷害:' + result_parameter.damage;

                            let damage_data = result.damage_data;

                            if (damage_data != null) {

                                let damage_increase = damage_data.now_damage_increase;
                                let yesterday_damage_increase = damage_data.yesterday_damage_increase;
                                let yesterday_damage_proportion = damage_data.damage_proportion;

                                if (yesterday_damage_increase >= 0) {

                                    analysis_msg += '\n  前一日傷害:' + yesterday_damage_increase;
                                    analysis_msg += '\n  更新傷害  :' + damage_increase;
                                    if (yesterday_damage_increase > 0) {
                                        let icon = (damage_increase >= yesterday_damage_increase) ? '+' : '-';

                                        analysis_msg += '\n' + icon + ' 傷害增幅比例:' + yesterday_damage_proportion + '%';
                                    } else {
                                        analysis_msg += '\n- 傷害增幅比例:前一日無傷害，無法比較';
                                    }
                                } else {
                                    analysis_msg += '\n-總傷害值比前一日低無法比較';
                                }
                            }
                            public_function.sendMessage(data, msg + update_status_msg + analysis_msg + '\n```');
                        } else {
                            public_function.sendMessage(data, '指令輸入有誤');
                        }
                        break;
                    /**
                     * !!list
                     * !!list {day}
                     * !!list {id}
                     * */
                    case 'list':
                        if (message_str == '') {
                            datas = await bot_command_behavior.getListNowDayDamge();

                            if (datas.length > 0) {
                                msg += (now_date.getMonth() + 1) + '/' + now_date.getDate() + ' 傷害\n```diff';
                                datas.forEach(function (v, i) {

                                    let id = v.id;
                                    let damage = v.damage;
                                    let is_update = v.is_update;
                                    let yesterday_damage_proportion = v.yesterday_damage_proportion;
                                    let icon = (is_update && yesterday_damage_proportion >= 0) ? '+' : '-';
                                    let proportion_icon = (yesterday_damage_proportion >= 0) ? '↑' : '↓';

                                    if (is_update) {
                                        msg += '\n' + icon + ' 暱稱:' + public_function.strFilling(id, 'r', 20, ' ') + '當前總傷害:' + public_function.strFilling(damage, 'r', 10, ' ') + proportion_icon + Math.abs(yesterday_damage_proportion) + '%';
                                    } else {
                                        msg += '\n' + icon + ' 暱稱:' + public_function.strFilling(id, 'r', 20, ' ') + '當前總傷害:' + public_function.strFilling(damage, 'r', 10, ' ') + '尚未填寫傷害';
                                    }
                                });

                                msg += '\n```';

                            } else {
                                msg += '```diff\n-搜尋的日期不是公會戰期間\n```';
                            }

                        } else {

                            //輸入2個數字(當月幾號)
                            let day = parseInt(message_str.substring(0, 2).replace(/ /g, ""));
                            if (!isNaN(day)) {
                                datas = await bot_command_behavior.getListDayDamge(day);

                                if (datas.length > 0) {
                                    msg += (now_date.getMonth() + 1) + '/' + day + ' 傷害\n```diff';
                                    datas.forEach(function (v, i) {

                                        let id = v.id;
                                        let damage = v.damage;
                                        let is_update = v.is_update;
                                        let yesterday_damage_proportion = v.yesterday_damage_proportion;
                                        let icon = (is_update && yesterday_damage_proportion >= 0) ? '+' : '-';
                                        let proportion_icon = (yesterday_damage_proportion >= 0) ? '↑' : '↓';

                                        if (is_update) {
                                            msg += '\n' + icon + ' 暱稱:' + public_function.strFilling(id, 'r', 20, ' ') + '當前總傷害:' + public_function.strFilling(damage, 'r', 10, ' ') + proportion_icon + Math.abs(yesterday_damage_proportion) + '%';
                                        } else {
                                            msg += '\n' + icon + ' 暱稱:' + public_function.strFilling(id, 'r', 20, ' ') + '當前總傷害:' + public_function.strFilling(damage, 'r', 10, ' ') + '尚未填寫傷害';
                                        }
                                    });

                                    msg += '\n```';

                                } else {
                                    msg += '```diff\n-搜尋的日期不是公會戰期間\n```';
                                }
                            } else {
                                //用遊戲暱稱取的當月所有資料
                                datas = await bot_command_behavior.getListNicknameData(message_str);
                                if (datas.length > 0) {
                                    msg += message_str + '  ' + (now_date.getMonth() + 1) + '月公會戰傷害統計\n```diff';
                                    datas.forEach(function (v, i) {

                                        let date = v.date;
                                        let damage = v.damage;
                                        let is_update = v.is_update;
                                        let yesterday_damage_proportion = v.yesterday_damage_proportion;
                                        let icon = (is_update && yesterday_damage_proportion >= 0) ? '+' : '-';
                                        let proportion_icon = (yesterday_damage_proportion >= 0) ? '↑' : '↓';

                                        if (is_update) {
                                            msg += '\n' + icon + ' 日期:' + public_function.strFilling(date, 'r', 10, ' ') + '當日總傷害:' + public_function.strFilling(damage, 'r', 10, ' ') + proportion_icon + Math.abs(yesterday_damage_proportion) + '%';
                                        } else {
                                            msg += '\n' + icon + ' 日期:' + public_function.strFilling(date, 'r', 10, ' ') + '當日總傷害:' + public_function.strFilling(damage, 'r', 10, ' ') + '尚未填寫傷害';
                                        }
                                    });

                                    msg += '\n```';

                                } else {
                                    msg += '```diff\n-搜尋的遊戲暱稱查無資料\n```';
                                }
                            }
                        }

                        if (msg != '') {
                            public_function.sendMessage(data, msg);
                        } else {
                            public_function.sendMessage(data, '指令輸入有誤');
                        }

                        break;
                    /**
                     * !!reset
                     * */
                    case 'reset':
                        await bot_command_behavior.resetDamageExcel();

                        public_function.sendMessage(data, '傷害表已重置完畢');
                        break;
                    /**
                     * !!reset_start {月份} {開始日} {結束日}
                     * */
                    case 'reset_start':

                        parameter = message_str.split(' ');

                        await bot_command_behavior.damageActivityStart(parameter[0], parameter[1], parameter[2]);

                        public_function.sendMessage(data, '傷害表已重置並更新下次開戰日期');
                        break;
                    
                    default:
                        public_function.sendMessage(data, '查無指令');
                }
            }
        } catch (e) {
            if (typeof e != 'string') {
                public_function.writeErrorLog(e, init.time_difference, external_path, 'bot_main.js');
            } else {
                public_function.sendMessage(data, e);
            }
        }
    });
});
