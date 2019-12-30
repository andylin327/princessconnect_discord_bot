var external_path = '../Re_Dive_BOT/';
//引入
var GoogleSpreadsheet = require('google-spreadsheet');
var creds = require(external_path+'discord-136634083930-ed0899950e58.json');
var Discord = require('discord.io');
var logger = require('winston');
var init = require(external_path+'auth.json');

Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
//logger.level = "debug";
// Initialize Discord Bot
var bot = new Discord.Client({
   token: init.token,
   autorun: true
});
bot.on("ready", function (evt) {
    logger.info("Connected");
    logger.info("Logged in as: ");
    logger.info(bot.username + " - (" + bot.id + ")");
});

var is_int = /^[0-9]+$/;
var is_ds_id = /^[0-9]{18,18}$/;
var fs = require('fs');

bot.on("message", function (user, userID, channelID, message, evt) {
	
	//檢查訊息是否有帶入指定符號
	if (message.substring(0, 2) == '!!') {
		//先記錄當下時間
		var now_date 	= new Date();
		//設定時差
		now_date = setTimezone(now_date, init.time_difference);
		
		try{
			var create_date = new Date().Format("yyyy-MM-dd hh:mm:ss");
			let log = {
				user : user,
				userID : userID,
				channelID : channelID,
				message : message,
				create_date : create_date,
			}
			writeDateUpdateLog( '【'+create_date+'】 '+ JSON.stringify(log));
			
		} catch (e){
			writeErrorLog(e);
		}
		
		
		//用空白拆解訊息
		var args 		= message.substring(2).split(' ');
		//取得傷害數值
		var field 		= args[0];
		var damage 		= null;
		var nickname 	= null;
		//new Google API物件
		var doc 		= new GoogleSpreadsheet(init.path);		
		
		try{
		
			doc.useServiceAccountAuth(creds, function (err) {
				
				if (err) throw err;
				
				doc.getRows(3, function (err, rows) {
					
					if (err) throw err;
					
					//第一字組是discord uid
					if(is_ds_id.test(field)){
						
						damage = (is_int.test(args[1]))?args[1]:null;
						
						rows.forEach(function(item, index){
							
							if(item['唯一id'] == field && nickname == null){
								nickname = item['id'];
							}
						});
					}
					//第一字組是傷害值
					else if(is_int.test(field))
					{
						damage = field;
						
						rows.forEach(function(item, index){
							//console.log(item['id']+ ':' + item['唯一id'] + '------' + userID);
							if(item['唯一id'] == userID && nickname == null){
								nickname = item['id'];
							}
						});
					}
					//第一組字是遊戲暱稱
					else
					{
						//第二組字段傷害值
						if(is_int.test(args[1])){
							damage = args[1];
							
							rows.forEach(function(item, index){
								if(item['id'] == field && nickname == null){
									nickname = item['id'];
								}
							});
						}
					}
					
					if(damage == null){
						sendMessage(bot, channelID, '輸入的傷害值錯誤');
					} else if(nickname  == null){
						sendMessage(bot, channelID, '找不到遊戲暱稱');
					} else {
						
						//將時間往前推5小時(因為重置時間為白天5點)
						now_date.setHours(now_date.getHours()- 5);
						var now_y 		= now_date.getFullYear();
						
						//取得活頁簿欄位資料(index:7)
						/*
						傷害表:7
						成員名單:3
						測試傷害表:12
						*/
						///*
						doc.getRows(7, function (err, rows) {
							var columns = [];
							var column_name = '';
							var is_update = false;
							
							//逐列讀取所有資料(不包含標頭，也就是第一列)
							rows.forEach(function(item, index, array){
								
								//index = 0，代表第2列
								switch(index){
									case 0://取得第2列，用當下紀錄時間與欄位的日期進行配對
										let json = JSON.stringify(item);
										
										let item_arr = [];
										JSON.parse(json, (key, value) => {
																							
											if(value != ''){
												let timestamp_date = new Date(now_y+'-'+value+ ' '+ now_date.getHours() + ':' + now_date.getMinutes() + ':' + now_date.getSeconds());
												
												let timestamp = parseInt(Date.parse(timestamp_date));
													
												if(!isNaN(timestamp) || value == 'Total'){
													columns.push(key);
													
													if(parseInt(Date.parse(now_date)) == timestamp){
														//有比對成功就紀錄欄位的名字(如果沒有標頭，google會回傳【_xxxxxx】英數混和的碼，這樣會無法儲存)
														column_name = key;
													}
												}
											}
										});
									break;
									default:
										//開始針對暱稱搜尋資料
										//如果已更新就跳過
										if(!is_update){
											//暱稱比對成功就更新資料
											if(item.id == nickname){
												
												let code = parseInt('C'.charCodeAt());
												columns.forEach(function(value, key){
													
													if(is_update){
														item[value] = '='+(String.fromCharCode((code-1))) + (index + 2);
													} else if(value == column_name){
														item[value] = damage;
														is_update = true;
													}
													
													code++;
												});
												
												try{
													item.save();
												}catch(e){
													writeErrorLog(e);
												}
											}
										}
								}
							});
							
							if(!is_update){
								if(column_name == ''){
									sendMessage(bot, channelID, '現在不是公會戰期間');
								} else {
									sendMessage(bot, channelID, '找不到你的遊戲暱稱');
								}
							} else {
								sendMessage(bot, channelID, '暱稱:'+nickname + '      總傷害:'+ damage +' >>> 資料已更新');
							}
							
						});
					}	
				});
			});	
		
		} catch (e){
			writeErrorLog(e);
		}
	}
});//end bot.on

//發送訊息
function sendMessage(bot, channelID, message){
	bot.sendMessage({
		to: channelID,
		message: message,
	});
}

function writeDateUpdateLog(msg){
	try{
		if(fs == undefined){
			var fs = require('fs');
		}

		fs.appendFile(external_path+'write_log.txt', msg +'\n', function (err) {
			if (err) throw err;
		});
	} catch(e){
		throw e
	}
}

function writeErrorLog(msg){
	try{
		if(fs == undefined){
			var fs 	= require('fs');
		}
		var date	= setTimezone(new Date(), init.time_difference);
		
		fs.appendFile(external_path+'error_log.txt', '【'+date.Format("yyyy-MM-dd hh:mm:ss")+'】'+ msg +'\n', function (err) {
			if (err) throw err;
		});
	} catch(e){
		console.log('----------------Error----------------');
		console.log('檔案寫入失敗。');
		console.log(e);
	}	
}

function setTimezone(date, timezone){
	utc_offset = (date.getTimezoneOffset() * -1) / 60;

	if(utc_offset != timezone){
		date.setHours(date.getHours() - utc_offset + timezone);
	}
	
	return date;
}