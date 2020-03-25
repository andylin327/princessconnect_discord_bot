function publicFunction() {

	var _this = this;

	this.dateFormat = function () {
		Date.prototype.Format = function (fmt) {
			var o = {
				"M+": this.getMonth() + 1, //��� 
				"d+": this.getDate(), //�� 
				"h+": this.getHours(), //�p? 
				"m+": this.getMinutes(), //�� 
				"s+": this.getSeconds(), //�� 
				"q+": Math.floor((this.getMonth() + 3) / 3), //�u�� 
				"S": this.getMilliseconds() //�@�� 
			};
			if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
			for (var k in o)
				if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
			return fmt;
		}
	};

	//�o�e�T��
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

			fs.appendFile(external_path + 'error_log.txt', '�i' + date.Format("yyyy-MM-dd hh:mm:ss") + '�j' + msg + '\n', function (err) {
				if (err) throw err;
			});
		} catch (e) {
			console.log('----------------Error----------------');
			console.log('�ɮ׼g�J���ѡC');
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



