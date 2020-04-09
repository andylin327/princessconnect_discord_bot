var external_path = '../Re_Dive_BOT/';
//引入
const CronJob   			= require('cron').CronJob;
const publicFunction		= require('./public_function.js');
const GoogleExcel			= require('./GoogleExcel.js');
const Discord				= require('discord.js');
const init					= require(external_path + 'auth.json');
const creds					= require(external_path + init.google_creds);
const { GoogleSpreadsheet } = require('google-spreadsheet');
const public_function		= new publicFunction();
var webhook_init			= require(external_path + 'webhook_init.json');
const BotCommandBehavior	= require('./botCommandBehavior.js');
const hook					= new Discord.WebhookClient(webhook_init.webhook_id, webhook_init.webhook_token);
public_function.dateFormat();
const bot_command_behavior = new BotCommandBehavior();

var bot = new Discord.Client();
bot.login(init.token);

bot.on("ready", function (evt) {
	console.log('Discord BOT webhook_1.js Ready');

	/**
	 * 尋找尚未填寫傷害的人
	 * */
	new CronJob('0 30 4,23 * * *',async function() {
		try {
			//刪除暫存
			delete require.cache[require.resolve(external_path + 'webhook_init.json')];
			//重新引入 json 檔
			let webhook_init = require(external_path + 'webhook_init.json');

			//先記錄當下時間
			var now_date 	= new Date();
			//設定時差
			now_date = public_function.setTimezone(now_date, init.time_difference);

			let war_day_interval = webhook_init.war_day.split('-');
			//判斷當下時間是否是公會戰期間
			if (now_date.getDate() >= parseInt(war_day_interval[0]) && now_date.getDate() <= parseInt(war_day_interval[1])) {

				//將時間往前推5小時(因為重置時間為白天5點)
				now_date.setHours(now_date.getHours() - 5);

				var notice_list = [];

				//new Google API物件
				var doc = new GoogleSpreadsheet(init.path);
				var google_excel = new GoogleExcel(doc, creds);

				try {

					let datas = await bot_command_behavior.getListNowDayDamge();
					datas.forEach(function (v) {
						if (!v.is_update) {
							notice_list.push({ "nickname": v.id, "msg": "未填傷害" });
						}
					});

					var notice_msg = now_date.getFullYear() + '/' + (now_date.getMonth() + 1) + '/' + now_date.getDate() + " 尚未出刀提醒名單";
					var tag_names = "";
					notice_msg += "```diff\n";

					if (notice_list.length > 0) {
						try {
							var member_list_sheet = await google_excel.getSheet(init.member_list_sheet_index);

							try {
								var member_list_sheet_promise = member_list_sheet.getRows();

								await member_list_sheet_promise.then(function (member_list_sheet_rows) {

									member_list_sheet_rows.forEach(async function (google_excel_row_item, index, array) {

										let id = google_excel_row_item.getKeyItemData('ID');

										for (var i = 0; i < notice_list.length; i++) {
											if (id == notice_list[i]['nickname']) {

												let uid = google_excel_row_item.getKeyItemData('唯一ID');

												if (uid != null) {
													tag_names += "<@" + uid + ">";
												}
												
												notice_msg += "- " + public_function.strFilling(id, 'r', 20, ' ') + ' ' + notice_list[i].msg + "\n";
												break;
											}
										}
									});
								});
							} catch (e) {
								throw e;
							}

						} catch (e) {
							throw e;
						}
					} else {
						notice_msg += "+ 所有人員出刀已完畢";
					}

					notice_msg += "```";
					notice_msg += '\n' + tag_names
					hook.send(notice_msg);

				} catch (e) {
					throw e;
				}
			}
		} catch(e){
			console.log('----------------Error----------------');
			console.log(e);
			public_function.writeErrorLog(e, init.time_difference, external_path, 'webhook_1.js');
		}	
	}, null, true, 'Asia/Taipei');

	/**
	 * 當日結束前統計
	 * */
	new CronJob('30 59 4,23 * * *', async function () {
		try {
			//刪除暫存
			delete require.cache[require.resolve(external_path + 'webhook_init.json')];
			//重新引入 json 檔
			let webhook_init = require(external_path + 'webhook_init.json');

			//先記錄當下時間
			var now_date = new Date();
			//設定時差
			now_date = public_function.setTimezone(now_date, init.time_difference);

			let war_day_interval = webhook_init.war_day.split('-');

			//判斷當下時間是否是公會戰期間
			if (now_date.getDate() >= parseInt(war_day_interval[0]) && now_date.getDate() <= parseInt(war_day_interval[1])) {

				//將時間往前推5小時(因為重置時間為白天5點)
				now_date.setHours(now_date.getHours() - 5);

				//new Google API物件
				var doc = new GoogleSpreadsheet(init.path);
				var google_excel = new GoogleExcel(doc, creds);

				var notice_list = [];

				try {

					let datas = await bot_command_behavior.getListNowDayDamge();
					datas.forEach(function (v) {

						let id = v.id;

						if (v.is_update) {

							let damage = v.damage;
							let is_update = v.is_update;
							let yesterday_damage_proportion = v.yesterday_damage_proportion;
							let icon = (is_update && yesterday_damage_proportion >= 0) ? '+' : '-';
							let proportion_icon = (yesterday_damage_proportion >= 0) ? '↑' : '↓';
							let msg = public_function.strFilling(damage, 'r', 10, ' ');
							msg += proportion_icon + Math.abs(yesterday_damage_proportion) + '%';

							notice_list.push({ "nickname": id, "msg": msg, "is_tag": !(v.is_update), 'notice_color_mark': icon });
						} else {
							notice_list.push({ "nickname": id, "msg": "隔日請記得填寫，可以請幹部協助補填分數，謝謝。", "is_tag": !(v.is_update), 'notice_color_mark': '-' });
						}
					});

					var notice_msg = now_date.getFullYear() + '/' + (now_date.getMonth() + 1) + '/' + now_date.getDate() + " 單日傷害紀錄";
					var tag_names = "";
					notice_msg += "```diff\n";

					if (notice_list.length > 0) {
						try {
							var member_list_sheet = await google_excel.getSheet(init.member_list_sheet_index);

							try {
								var member_list_sheet_promise = member_list_sheet.getRows();

								await member_list_sheet_promise.then(function (member_list_sheet_rows) {

									member_list_sheet_rows.forEach(async function (google_excel_row_item, index, array) {

										let id = google_excel_row_item.getKeyItemData('ID');

										for (var i = 0; i < notice_list.length; i++) {
											if (id == notice_list[i]['nickname']) {
												let notice_color_mark = notice_list[i]['notice_color_mark'];
												if (notice_list[i].is_tag) {
													let uid = google_excel_row_item.getKeyItemData('唯一ID');

													if (uid != null) {
														tag_names += "<@" + uid + ">";
													}

													notice_color_mark = '-';
												}

												notice_msg += notice_color_mark + " " + public_function.strFilling(id, 'r', 20, ' ') + notice_list[i].msg + "\n";
												break;
											}
										}
									});
								});
							} catch (e) {
								throw e;
							}

						} catch (e) {
							throw e;
						}

						notice_msg += "```";
						notice_msg += '\n' + tag_names
						hook.send(notice_msg);
					}

				} catch (e) {
					throw e;
				}
			}
		} catch (e) {
			console.log('----------------Error----------------');
			console.log(e);
			public_function.writeErrorLog(e, init.time_difference, external_path, 'webhook_1.js');
		}

	}, null, true, 'Asia/Taipei');
});