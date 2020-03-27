var external_path 		= '../Re_Dive_BOT/';
//引入
const publicFunction	= require('./public_function.js');
const GoogleExcel		= require('./GoogleExcel.js');
const Discord 			= require('discord.js');
const logger 			= require('winston');
const init 				= require(external_path + 'auth.json');
const creds				= require(external_path + init.google_creds);
const { GoogleSpreadsheet }	= require('google-spreadsheet');
const public_function	= new publicFunction(); 
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
var bot = new Discord.Client();
bot.login(init.token);

bot.on("ready", function () {

	console.log('Discord BOT Ready');

	bot.on("message", async function (data) {

		var message = data.content;
		var user = data.author.username;
		var userID = data.author.id;
		var channelID = data.channel.id;
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

			try {
				var create_date = new Date().Format("yyyy-MM-dd hh:mm:ss");
				let log = {
					user: user,
					userID: userID,
					channelID: channelID,
					message: message,
					create_date: create_date,
				}
				public_function.writeDateUpdateLog('【' + create_date + '】 ' + JSON.stringify(log), external_path);

			} catch (e) {
				public_function.writeErrorLog(e, init.time_difference, external_path, 'bot.js');
			}

			//用空白拆解訊息
			var args = message.substring(2).split(' ');
			//取得第一字組文字
			var field = args[0].replace(/\s+/g, "");
			var damage = null;
			var nickname = null;
			//new Google API物件
			var doc = new GoogleSpreadsheet(init.path);

			var google_excel = new GoogleExcel(doc, creds);

			try {
				//指令確認
				switch (field) {
					//列出當前紀錄
					case 'list':

						//將時間往前推5小時(因為重置時間為白天5點)
						now_date.setHours(now_date.getHours() - 5);
						var now_y = now_date.getFullYear();

						//取得活頁簿欄位資料(index:6)
						/*
						傷害表:6
						成員名單:2
						*/
						///*
						var damage_list_sheet = await google_excel.getSheet(init.damage_list_sheet_index);
						try {
							var damage_list_sheet_promise = damage_list_sheet.getRows();
						} catch (e) {
							throw e;
						}

						var columns = [];
						var column_name = '';

						await damage_list_sheet_promise.then(function (damage_list_sheet_rows) {

							let headers = damage_list_sheet.getHeaders();
							let lists = [];
							damage_list_sheet_rows.forEach(async function (google_excel_row_item, index) {

								switch (index) {
									case 0:
										headers.forEach(function (value, index) {
											let item_data = google_excel_row_item.getKeyItemData(value);
											
											let timestamp_date = new Date(now_y + '-' + item_data + ' ' + now_date.getHours() + ':' + now_date.getMinutes() + ':' + now_date.getSeconds());

											let timestamp = parseInt(Date.parse(timestamp_date));

											if (!isNaN(timestamp)) {

												columns.push(value);

												if (parseInt(Date.parse(now_date)) == timestamp) {
													
													//有比對成功就紀錄欄位的名字(如果沒有標頭，google會回傳【_xxxxxx】英數混和的碼，這樣會無法儲存)
													column_name = value;
												}
											}
										});
										break;
									default:

										if (column_name != '') {

											let id = google_excel_row_item.getKeyItemData('ID');
											if (id != '') {
												columns.forEach(function (value, index) {
													if (value == column_name) {
														let damage = parseInt(google_excel_row_item.getKeyItemData(value).replace(/,/g, ""));
														let yesterday_damage = null;
														//抓昨天的傷害值
														if (index > 1) {
															yesterday_damage = parseInt(google_excel_row_item.getKeyItemData(columns[index - 1]).replace(/,/g, ""));
														}

														lists.push({ id: id, damage: damage, is_update: (damage != yesterday_damage) });
													}
												});
                                            }
										}
								}
							});

							if (lists.length > 0) {
								let msg = '\n```diff';
								lists.forEach(function (v, i) {

									let id = v.id;
									let damage = v.damage;
									let is_update = v.is_update;
									let icon = (is_update) ? '+' : '-';

									msg += '\n' + icon + ' 暱稱:' + id + '      當前總傷害:' + damage;
								});

								msg += '\n```';

								public_function.sendMessage(data, msg);
							} else {
								public_function.sendMessage(data, '```diff\n-現在不是公會戰期間\n```');
                            }
						});

						break;
					//非指定指令，輸入傷害用
					default:
						var member_list_sheet = await google_excel.getSheet(init.member_list_sheet_index);

						try {
							var member_list_sheet_promise = member_list_sheet.getRows();
						} catch (e) {
							throw e;
						}

						//第一字組是discord uid
						if (is_ds_id.test(field)) {
							damage = (is_int.test(args[1])) ? args[1] : null;

							await member_list_sheet_promise.then(function (member_list_sheet_rows) {

								member_list_sheet_rows.forEach(function (google_excel_row_item, index, array) {
									let only_id = google_excel_row_item.getKeyItemData('唯一ID');
									if (only_id == field && nickname == null) {
										nickname = google_excel_row_item.getKeyItemData('ID');
										return;
									}
								});
							});
						}
						//第一字組是傷害值
						else if (is_int.test(field)) {
							damage = field;

							await member_list_sheet_promise.then(function (member_list_sheet_rows) {

								for (var i = 0; i < member_list_sheet_rows.length; i++) {
									let only_id = member_list_sheet_rows[i].getKeyItemData('唯一ID');

									if (only_id == userID && nickname == null) {
										nickname = member_list_sheet_rows[i].getKeyItemData('ID');
										return;
									}
								}
							});
						}
						//第一組字是遊戲暱稱
						else {
							//第二組字段傷害值
							if (is_int.test(args[1])) {
								damage = args[1];

								if (field != '') {
									await member_list_sheet_promise.then(function (member_list_sheet_rows) {
										member_list_sheet_rows.forEach(function (google_excel_row_item, index, array) {
											let id = google_excel_row_item.getKeyItemData('ID');
											if (id == field && nickname == null) {
												nickname = id;
												return;
											}
										});
									});
								}
							}
						}

						if (damage == null) {
							public_function.sendMessage(data, '```diff\n-輸入的傷害值錯誤 \n```');
						} else if (nickname == null) {
							public_function.sendMessage(data, '```diff\n-找不到遊戲暱稱\n```');
						} else {

							//將時間往前推5小時(因為重置時間為白天5點)
							now_date.setHours(now_date.getHours() - 5);
							var now_y = now_date.getFullYear();

							//取得活頁簿欄位資料(index:6)
							/*
							傷害表:6
							成員名單:2
							*/
							///*
							var damage_list_sheet = await google_excel.getSheet(init.damage_list_sheet_index);
							try {
								var damage_list_sheet_promise = damage_list_sheet.getRows();
							} catch (e) {
								throw e;
							}

							var is_update = false;
							var columns = [];
							var column_name = '';
							var yesterday_data = null;
							var the_day_before_yesterday_data = 0;

							await damage_list_sheet_promise.then(function (damage_list_sheet_rows) {

								let headers = damage_list_sheet.getHeaders();

								damage_list_sheet_rows.forEach(async function (google_excel_row_item, index) {

									switch (index) {
										case 0:
											headers.forEach(function (value, index) {
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
														}
													}
												}
											});
											break;
										default:
									
											if (column_name != '') {

												//開始針對暱稱搜尋資料
												//如果已更新就跳過
												if (!is_update) {

													let id = google_excel_row_item.getKeyItemData('ID');

													//暱稱比對成功就更新資料
													if (id == nickname) {

														let code = parseInt('C'.charCodeAt());
														columns.forEach(function (value, key) {
															if (is_update) {
																//更新後，將後續欄位都放上關聯前一個的寫法
																google_excel_row_item.setValue(value, '=' + (String.fromCharCode((code - 2))) + (index + 2));
															} else if (value == 'ID') {
																google_excel_row_item.setValue(value, "='01月角色調查'!A" + (index + 2));
															} else if (value == column_name) {
																//是否錯誤，錯誤的話不寫入傷害值
																let is_error = false;

																//抓昨天的傷害值，來計算一些東西
																if (key > 1) {
																	yesterday_data = parseInt(google_excel_row_item.getKeyItemData(columns[key - 1]).replace(/,/g, ""));
																	the_day_before_yesterday_data = parseInt(google_excel_row_item.getKeyItemData(columns[key - 2]).replace(/,/g, ""));
																	if(isNaN(the_day_before_yesterday_data)){
																		the_day_before_yesterday_data = 0;
																	}
																	//臨時計算傷害增幅不可超過5倍(避免有人填錯的防呆)
																	if (((damage - yesterday_data) / (yesterday_data - the_day_before_yesterday_data)) > 5) {
																		is_error = true;
                                                                    }
																}

																is_update = true;
																if (!is_error) {
																	google_excel_row_item.setValue(value, damage);
                                                                }
															}

															code++;
														});

														try {
															await google_excel_row_item.save();
														} catch (e) {
															public_function.sendMessage(data, '```diff\n-資料更新失敗 \n```');
															public_function.writeErrorLog(e, init.time_difference, external_path, 'bot.js');
														}
													}
												}
											}
									}
								});
							});

							if (!is_update) {
								if (column_name == '') {
									public_function.sendMessage(data, '```diff\n-現在不是公會戰期間\n```');
								} else {
									public_function.sendMessage(data, '```diff\n-找不到你的遊戲暱稱\n```');
								}
							} else {

								let msg = '\n```diff\n';
								let update_status_msg = '\n+資料已更新';
								let analysis_msg = '';
								msg += '暱稱:' + nickname + '      更新總傷害:' + damage;
								
						
								if (yesterday_data != null && yesterday_data != undefined) {

									let yesterday_damage = yesterday_data - the_day_before_yesterday_data;
							
									let add_damage 			= damage - yesterday_data;
									let icon				= (add_damage >= yesterday_damage) ? '+' : '-';

									if ((damage - yesterday_data) >= 0) {

										let add_damage_percentage = (Math.round(add_damage / yesterday_damage * 100, 2) - 100);

										//臨時計算傷害增幅不可超過5倍(避免有人填錯的防呆)
										if (add_damage_percentage >= 500) {
											update_status_msg = '\n-資料更新失敗，送出的傷害值過高，請確認是否填錯，如數值無誤，請洽管理員協助人工修改。';
										} else {
											analysis_msg += '\n  前一日傷害:' + yesterday_damage;
											analysis_msg += '\n  本日傷害  :' + add_damage;
											if (yesterday_damage > 0) {
												analysis_msg += '\n' + icon + ' 傷害增幅比例:' + add_damage_percentage + '%';
											} else {
												analysis_msg += '\n- 傷害增幅比例:前一日無傷害，無法比較';
											}
                                        }
									} else {
										analysis_msg += '\n-總傷害值比前一日低無法比較';
                            						}
								}

								public_function.sendMessage(data, msg + update_status_msg + analysis_msg + '\n```');
							}
						}
				}
			} catch (e) {
				console.log(e);
				public_function.writeErrorLog(e, init.time_difference, external_path, 'bot.js');
			}
		}
	});//end bot.on message
});//end bot.on ready