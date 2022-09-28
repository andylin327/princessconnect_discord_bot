var external_path 		= '../Re_Dive_BOT/';
//引入
const publicFunction	= require('./public_function.js');
const Discord 			= require('discord.js');
const logger 			= require('winston');
const init 				= require(external_path + 'auth.json');
const BotCommandBehavior	= require('./BotCommandBehavior.js');
const bot_command_behavior	= new BotCommandBehavior(); 
const public_function		= new publicFunction(); 
public_function.dateFormat();

var is_int = /^[0-9]+$/;
var is_ds_id = /^[0-9]{18,18}$/;

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
//logger.level = "debug";
// Initialize Discord Bot
var bot = new Discord.Client({intents:[198656]});
bot.login(init.token);

bot.on("ready", function () {

	console.log('Discord BOT Ready');

	bot.on("message", async function (data) {

		let message = data.content;
		let user = data.author.username;
		let userID = data.author.id;
		let channelID = data.channel.id;
		//console.log(user);
		//console.log(userID);
		//console.log(channelID);
		//console.log(message);

		//檢查訊息是否有帶入指定符號
		if (message.substring(0, 2) == '!!') {

			//先記錄當下時間
			var now_date = new Date();
			//設定時差
			now_date = public_function.setTimezone(now_date, init.time_difference);
			
			//try {
			//	let create_date = new Date().Format("yyyy-MM-dd hh:mm:ss");
			//	let log = {
			//		user: user,
			//		userID: userID,
			//		channelID: channelID,
			//		message: message,
			//		create_date: create_date,
			//	}
			//	public_function.writeDateUpdateLog('【' + create_date + '】 ' + JSON.stringify(log), external_path);
			//
			//} catch (e) {
			//	public_function.writeErrorLog(e, init.time_difference, external_path, 'bot.js');
			//}

			//用空白拆解訊息
			let args = message.substring(2).split(' ');
			//取得第一字組文字
			let field = args[0].replace(/\s+/g, "");
			let damage = null;
			let nickname = null;
			let msg = '';

			try {
				//將時間往前推5小時(因為重置時間為白天5點)
				now_date.setHours(now_date.getHours() - 5);

				//指令確認
				switch (field) {
					//列出當前紀錄
					case 'list':
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
							msg += '```diff\n-現在不是公會戰期間\n```';
						}

						public_function.sendMessage(data, msg);

						break;
					//非指定指令，輸入傷害用
					default:

						let id = '';
						let day = now_date.getDate();

						//第一字組是discord uid
						if (is_ds_id.test(field)) {
							damage = (is_int.test(args[1])) ? args[1] : null;
							id = parseInt(userID);
						}
						//第一字組是傷害值
						else if (is_int.test(field)) {
							damage = field;
							id = parseInt(userID);
						}
						//第一組字是遊戲暱稱
						else {
							//第二組字段傷害值
							damage = (is_int.test(args[1])) ? args[1] : null;
							id = field;
						}

						let update_damage_promise = bot_command_behavior.updateDamage(id, day, damage);

						await update_damage_promise.then(function (result) {

							if (result.is_update) {
								row_item = result.data;
								//拉舊資料的 value
								//更新後的資料抓不到ID，因為已經變成google試算表關聯欄位的代碼
								nickname = row_item.getOldValue()[0];

								let msg = '\n```diff';
								let update_status_msg = '\n+資料已更新';
								let analysis_msg = '';
								msg += '\n暱稱:' + public_function.strFilling(nickname, 'r', 16, ' ') + '日期:' + public_function.strFilling((now_date.getMonth() + 1) + '/' + day, 'r', 10, ' ') + '更新總傷害:' + damage;

								let damage_data = result.damage_data;

								if (damage_data != null) {

									let damage_increase = damage_data.now_damage_increase;
									let yesterday_damage_increase = damage_data.yesterday_damage_increase;
									let yesterday_damage_proportion = damage_data.damage_proportion;

									if (yesterday_damage_increase >= 0) {

										analysis_msg += '\n  前一日傷害:' + yesterday_damage_increase;
										analysis_msg += '\n  本日傷害  :' + damage_increase;
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
								public_function.sendMessage(data, '```diff\n-資料更新失敗 \n```');
							}
						});
				}
			} catch (e) {
				//console.log(e);

				if (typeof e == 'string') {
					public_function.sendMessage(data, e);
				} else {
					public_function.sendMessage(data, '<@' + userID +'>\n```diff\n-更新失敗\n-指令執行發生錯誤 \n```');
					public_function.writeErrorLog(e, init.time_difference, external_path, 'bot.js');
                }
			}
		}
	});//end bot.on message
});//end bot.on ready
