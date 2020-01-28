var external_path 		= '../Re_Dive_BOT/';
//引入
var CronJob   			= require('cron').CronJob;
var GoogleSpreadsheet 	= require('google-spreadsheet');
var Discord 			= require('discord.io');
var logger 				= require('winston');
var init 				= require(external_path + 'auth.json');
var creds 				= require(external_path + init.google_creds);
var webhook_init		= require(external_path + 'webhook_init.json');

const Discordjs = require('discord.js');
const hook = new Discordjs.WebhookClient(webhook_init.webhook_id, webhook_init.webhook_token);

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});

var bot = new Discord.Client({
   token: init.token,
   autorun: true
});
bot.on("ready", function (evt) {
    logger.info("Connected");
    logger.info("Logged in as: ");
    logger.info(bot.username + " - (" + bot.id + ")");
	
	new CronJob('55 59 4,23 '+webhook_init.war_day+' * *', function() {
		
		try{
			//先記錄當下時間
			var now_date 	= new Date();
			//設定時差
			now_date = setTimezone(now_date, init.time_difference);
			
			//將時間往前推5小時(因為重置時間為白天5點)
			now_date.setHours(now_date.getHours()- 5);
			var now_y 		= now_date.getFullYear();
			
			//new Google API物件
			var doc 		= new GoogleSpreadsheet(init.path);
			
			//取得活頁簿欄位資料(index:7)
			/*
			傷害表:7
			成員名單:3
			*/
			///*
			var notice_list = [];
			doc.useServiceAccountAuth(creds, function (err) {
				
				if (err) throw err;
				
				doc.getRows(7, function (err, rows) {
					
					if (err) throw err;
					
					var columns = [];
					var column_name = '';
					var prev_column_name = '';
					
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
											}else if(column_name == ''){
												prev_column_name = key;
											}
										}
									}
								});
							break;
							default:
							
								var nickname = item.id;
								if(nickname != ''){
									//前一天傷害
									if(item[prev_column_name] == undefined){
										var prev_damage = 0;
									} else {
										var prev_damage = parseInt(item[prev_column_name].replace(/,/g, ""));
									}
									
									//目前傷害
									var now_damage = parseInt(item[column_name].replace(/,/g, ""));
									
									console.log('nickname:'+nickname);
									console.log('now_damage:'+now_damage);
									console.log('prev_damage:'+prev_damage);
									
									var damage_difference = getDamageDifference(now_damage, prev_damage);
									
									if(prev_damage = 0){
										//沒有前一天資料欄位
										if(now_damage == 0){
											notice_list.push({"nickname" : nickname, "msg" : "隔日請記得填寫，可以請幹部協助補填分數，謝謝。", "is_tag" : true});
										} else {
											notice_list.push({"nickname" : nickname, "msg" : damage_difference, "is_tag" : (damage_difference <= 0)});
										}
									} else {
										
										if(damage_difference > 0){
											notice_list.push({"nickname" : nickname, "msg" : damage_difference, "is_tag" : false});
										} else {
											notice_list.push({"nickname" : nickname, "msg" : "隔日請記得填寫，可以請幹部協助補填分數，謝謝。", "is_tag" : true});
										}
										
									}
								}
						}
					});
					
					if(notice_list.length > 0){
						
						doc.getRows(3, function (err, rows) {
							
							if (err) throw err;
							var notice_msg = (now_date.getMonth() + 1)+'/'+now_date.getDate()+' 傷害統計\n';
							rows.forEach(function(item, index){
								
								notice_list.forEach(function(notice, index){
									index++;
									if(index < 10){
										index = '0'+index;
									}
									if(item['id'] == notice['nickname']){
										if(notice['is_tag']){
											notice_msg += index+" <@"+item['唯一id']+"> "+ notice.msg+"\n";
										} else {
											notice_msg += index+ " "+ notice['nickname'] + " "+notice.msg+"\n";
										}
									}
								});
							});
							
							if(notice_msg != ''){
								hook.send(notice_msg);
							}
						});
					}
				});
			});
			
			
		} catch(e){
			console.log('----------------Error----------------');
			console.log(e);
		}	
		
	}, null, true, 'Asia/Taipei');
});

function getDamageDifference(now, prev){
	return now - prev
}

function setTimezone(date, timezone){
	utc_offset = (date.getTimezoneOffset() * -1) / 60;

	if(utc_offset != timezone){
		date.setHours(date.getHours() - utc_offset + timezone);
	}
	
	return date;
}