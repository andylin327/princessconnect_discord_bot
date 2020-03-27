/**
 * 單日傷害紀錄 推播
 * 
 * */
var external_path = '../Re_Dive_BOT/';
//引入
const CronJob					= require('cron').CronJob;
const publicFunction			= require('./public_function.js');
const GoogleExcel				= require('./GoogleExcel.js');
const Discord					= require('discord.js');
const init						= require(external_path + 'auth.json');
const creds						= require(external_path + init.google_creds);
const { GoogleSpreadsheet }		= require('google-spreadsheet');
const public_function			= new publicFunction();
var webhook_init				= require(external_path + 'webhook_init.json');
const hook						= new Discord.WebhookClient(webhook_init.webhook_id, webhook_init.webhook_token);
public_function.dateFormat();

var bot = new Discord.Client();
bot.login(init.token);

bot.on("ready", function (evt) {
	console.log('Discord BOT webhook_2.js Ready');
	
	new CronJob('30 59 4,23 * * *',async function() {
		
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
				var now_y = now_date.getFullYear();

				//new Google API物件
				var doc = new GoogleSpreadsheet(init.path);
				var google_excel = new GoogleExcel(doc, creds);

				var notice_list = [];


				try {
					var damage_list_sheet = await google_excel.getSheet(init.damage_list_sheet_index);

					try {
						var damage_list_sheet_promise = damage_list_sheet.getRows();

						var columns = [];
						var column_name = '';
						var prev_column_name = '';
						var the_day_before_yesterday_column_name = null;

						await damage_list_sheet_promise.then(async function (damage_list_sheet_rows) {
							let headers = damage_list_sheet.getHeaders();

							damage_list_sheet_rows.forEach(async function (google_excel_row_item, index, array) {
								switch (index) {
									case 0:
										headers.forEach(function (value, index, array) {
											let item_data = google_excel_row_item.getKeyItemData(value);
											//
											if (item_data == 'Total') {
												columns.push(value);
											} else {

												let timestamp_date = new Date(now_y + '-' + item_data + ' ' + now_date.getHours() + ':' + now_date.getMinutes() + ':' + now_date.getSeconds());

												let timestamp = parseInt(Date.parse(timestamp_date));

												if (!isNaN(timestamp)) {
													columns.push(value);

													if (parseInt(Date.parse(now_date)) == timestamp) {
														//有比對成功就紀錄欄位的名字(如果沒有標頭，google會回傳【_xxxxxx】英數混和的碼，這樣會無法儲存)
														column_name = value;
													} else if (column_name == '') {
														prev_column_name = value;
														the_day_before_yesterday_column_name = (headers[index - 1] != undefined) ? headers[index - 1] : null;
													}
												}
											}
										});
										break;
									default:

										var nickname = google_excel_row_item.getKeyItemData('ID');
										if (nickname != '') {
											//前一天傷害
											let prev_damage = parseInt(google_excel_row_item.getKeyItemData(prev_column_name).replace(/,/g, ""));
											if (isNaN(prev_damage)) {
												prev_damage = 0;
											}

											//目前傷害
											let now_damage = parseInt(google_excel_row_item.getKeyItemData(column_name).replace(/,/g, ""));
											let damage_difference = getDamageDifference(now_damage, prev_damage);

											if (isNaN(prev_damage)) {
												//沒有前一天資料欄位

												if (now_damage == 0) {
													notice_list.push({ "nickname": nickname, "msg": "隔日請記得填寫，可以請幹部協助補填分數，謝謝。", "is_tag": true });
												} else {
													notice_list.push({ "nickname": nickname, "msg": damage_difference, "is_tag": (damage_difference <= 0) });
												}
											} else {
												if (damage_difference > 0) {
													let msg = damage_difference;
													//計算昨日單日傷害以及增幅%數
													if (the_day_before_yesterday_column_name != null) {
														let the_day_before_yesterday_damage = parseInt(google_excel_row_item.getKeyItemData(the_day_before_yesterday_column_name).replace(/,/g, ""));
														let yesterday_damage = prev_damage - the_day_before_yesterday_damage;
														let icon = (damage_difference >= yesterday_damage) ? '↑' : '↓';
														let damage_proportion = (Math.round(damage_difference / yesterday_damage * 100, 2) - 100);

														msg += ' ' + icon + damage_proportion + '%';
													}

													notice_list.push({ "nickname": nickname, "msg": msg, "is_tag": false });
												} else {
													notice_list.push({ "nickname": nickname, "msg": "隔日請記得填寫，可以請幹部協助補填分數，謝謝。", "is_tag": true });
												}
											}
										}
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
														let notice_color_mark = '+';
														if (notice_list[i].is_tag) {
															let uid = google_excel_row_item.getKeyItemData('唯一ID');

															if (uid != null) {
																tag_names += "<@" + uid + ">";
															}

															notice_color_mark = '-';
														}

														notice_msg += notice_color_mark + " " + id + ' ' + notice_list[i].msg + "\n";
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
						});
					} catch (e) {
						throw e;
					}
				} catch (e) {
					throw e;
				}
			}
		} catch(e){
			console.log('----------------Error----------------');
			console.log(e);
			public_function.writeErrorLog(e, init.time_difference, external_path, 'webhook_2.js');
		}	
		
	}, null, true, 'Asia/Taipei');
});

function getDamageDifference(now, prev){
	return now - prev
}