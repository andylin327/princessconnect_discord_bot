function publicFunction() {

	var _this = this;

	this.dateFormat = function () {
		Date.prototype.Format = function (fmt) {
			var o = {
				"M+": this.getMonth() + 1, //月份 
				"d+": this.getDate(), //日 
				"h+": this.getHours(), //小? 
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
	};

	//發送訊息
	this.sendMessage = function (bot, messages) {
		bot.channel.send(messages);
		//bot.reply(messages);
	};
	this.writeDateUpdateLog = function (msg, external_path) {
		try {
			if (fs == undefined) {
				var fs = require('fs');
			}

			fs.appendFile(external_path + 'write_log.txt', msg + '\n', function (err) {
				if (err) throw err;
			});
		} catch (e) {
			throw e
		}
	};


	this.writeErrorLog = function (msg, time_difference, external_path) {
		try {
			if (fs == undefined) {
				var fs = require('fs');
			}
			var date = _this.setTimezone(new Date(), time_difference);

			fs.appendFile(external_path + 'error_log.txt', '【' + date.Format("yyyy-MM-dd hh:mm:ss") + '】' + msg + '\n', function (err) {
				if (err) throw err;
			});
		} catch (e) {
			console.log('----------------Error----------------');
			console.log('檔案寫入失敗。');
			console.log(e);
		}
	}

	this.setTimezone = function(date, timezone) {
		utc_offset = (date.getTimezoneOffset() * -1) / 60;

		if (utc_offset != timezone) {
			date.setHours(date.getHours() - utc_offset + timezone);
		}

		return date;
	}
};
module.exports = publicFunction;



