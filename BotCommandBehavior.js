'use strict';
const external_path = '../Re_Dive_BOT/';

function BotCommandBehavior() {

    var _this = this;

    /**
     * 更新傷害
     * @param {int|string} id
     * @param {int} day
     * @param {int} damage
     */
    this.updateDamage = async function (id, day, damage) {
        let init = require(external_path + 'auth.json');
        let creds = require(external_path + init.google_creds);
        let { GoogleSpreadsheet } = require('google-spreadsheet');
        let GoogleExcel = require('./GoogleExcel.js');
        let publicFunction = require('./public_function.js');
        let public_function = new publicFunction();
        let is_int = /^[0-9]+$/;

        //new Google API物件
        let doc = new GoogleSpreadsheet(init.path);
        let google_excel = new GoogleExcel(doc, creds);

        //先記錄當下時間
        let now_date = new Date();
        //設定時差
        now_date = public_function.setTimezone(now_date, init.time_difference);
            

        let member_list_sheet = await google_excel.getSheet(init.member_list_sheet_index);
        let nickname = null;
        let google_excel_row_item = null;
        //如果 id 是純數字，那就是去找 uid
        if (is_int.test(id)) {

            google_excel_row_item = await _this.sheetSearchData(member_list_sheet, '唯一ID', id);
            nickname = google_excel_row_item.getKeyItemData('ID');
        } 
        //如果 id 不是純數字，那就是去找遊戲暱稱
        else {

            google_excel_row_item = await _this.sheetSearchData(member_list_sheet, 'ID', id);
            nickname = google_excel_row_item.getKeyItemData('ID');
        }

        if (nickname == null) {
            throw '```diff\n-找不到遊戲暱稱\n```';
        } else {
            //將時間往前推5小時(因為重置時間為白天5點)
            now_date.setHours(now_date.getHours() - 5);
            now_date.setDate(day);
            let now_y = now_date.getFullYear();

            var damage_list_sheet = await google_excel.getSheet(init.damage_list_sheet_index);
            try {
                var damage_list_sheet_promise = damage_list_sheet.getRows();
            } catch (e) {
                throw e;
            }

            let result = {
                parameter: {
                    id: id,
                    day: day,
                    damage : damage
                },
                is_update: false,
                data: null,
                damage_data: null,
                member_data: {
                    nickname: nickname,
                    uid: google_excel_row_item.getKeyItemData('唯一ID')
                }
            };
            let columns = [];
            let column_name = '';
            let is_check_error = false;

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
                                if (!result.is_update) {

                                    let id = google_excel_row_item.getKeyItemData('ID');

                                    //暱稱比對成功就更新資料
                                    if (id == nickname) {

                                        let code = parseInt('C'.charCodeAt());

                                        columns.forEach(function (value, key) {
                                            if (result.is_update) {
                                                //更新後，將後續欄位都放上關聯前一個的寫法
                                                google_excel_row_item.setValue(value, '=' + (String.fromCharCode((code - 2))) + (index + 2));
                                            } else if (value == 'ID') {
                                                google_excel_row_item.setValue(value, "='01月角色調查'!A" + (index + 2));
                                            } else if (value == column_name) {

                                                //抓昨天的傷害值，來計算一些東西
                                                if (key > 1) {
                                                    let yesterday_damage = 0;
                                                    let the_day_before_yesterday_damage = 0;

                                                    yesterday_damage = parseInt(google_excel_row_item.getKeyItemData(columns[key - 1]).replace(/,/g, ""));

                                                    if (key > 2) {
                                                        the_day_before_yesterday_damage = parseInt(google_excel_row_item.getKeyItemData(columns[key - 2]).replace(/,/g, ""));
                                                    }

                                                    let calculation_damage = _this.calculationDamage(damage, yesterday_damage, the_day_before_yesterday_damage);

                                                    result.damage_data = calculation_damage;

                                                    let damage_increase = calculation_damage.now_damage_increase;
                                                    let yesterday_damage_increase = calculation_damage.yesterday_damage_increase;
                                                    let yesterday_damage_proportion = calculation_damage.damage_proportion;

                                                    //臨時計算傷害增幅不可超過5倍(避免有人填錯的防呆)
                                                    if (yesterday_damage_increase > 0 && (damage_increase / yesterday_damage_increase) > 5) {
                                                        is_check_error = true;
                                                    }
                                                }

                                                result.is_update = true;
                                                google_excel_row_item.setValue(value, damage);
                                            }

                                            code++;
                                        });

                                        try {
                                            result.data = google_excel_row_item;

                                            if (!is_check_error) {
                                                await google_excel_row_item.save();
                                            }
                                            
                                        } catch (e) {
                                            console.log(e);
                                            throw '```diff\n-資料更新失敗 \n```';
                                        }
                                    }
                                }
                            }
                    }
                });
            });

            if (!result.is_update) {
                if (column_name == '') {
                    throw '```diff\n-現在不是公會戰期間\n```';
                } else {
                    throw '```diff\n-找不到你的遊戲暱稱\n```';
                }
            } else {
                if (is_check_error) {
                    throw '```diff\n-資料更新失敗，送出的傷害值過高，請確認是否填錯，如數值無誤，請洽管理員協助人工修改。```';
                }
            }
            return result;
        }
    }


    /**
     * 用遊戲暱稱來取得當月所有資料
     * @param {string} nickname
     */
    this.getListNicknameData = async function (nickname) {

        let init = require(external_path + 'auth.json');
        let creds = require(external_path + init.google_creds);
        let { GoogleSpreadsheet } = require('google-spreadsheet');
        let GoogleExcel = require('./GoogleExcel.js');
        let publicFunction = require('./public_function.js');
        let public_function = new publicFunction();

        try {
            //new Google API物件
            let doc = new GoogleSpreadsheet(init.path);
            let google_excel = new GoogleExcel(doc, creds);

            //let damage_list_sheet = await google_excel.getSheet(init.damage_list_sheet_index);
            let damage_list_sheet = await google_excel.getSheet(6);
            //先記錄當下時間
            let now_date = new Date();
            //設定時差
            now_date = public_function.setTimezone(now_date, init.time_difference);
            //將時間往前推5小時(因為重置時間為白天5點)
            now_date.setHours(now_date.getHours() - 5);
            var now_y = now_date.getFullYear();

            let columns = [];
            let datas = [];

            try {
                var damage_list_sheet_promise = damage_list_sheet.getRows();
            } catch (e) {
                throw e;
            }

            await damage_list_sheet_promise.then(function (damage_list_sheet_rows) {

                let headers = damage_list_sheet.getHeaders();
                let column_valus = [];

                damage_list_sheet_rows.forEach(async function (google_excel_row_item, index) {

                    switch (index) {
                        case 0:
                            headers.forEach(function (value, index) {
                                let item_data = google_excel_row_item.getKeyItemData(value);
                                if (item_data != '') {
                                    let timestamp_date = new Date(now_y + '-' + item_data + ' ' + now_date.getHours() + ':' + now_date.getMinutes() + ':' + now_date.getSeconds());

                                    let timestamp = parseInt(Date.parse(timestamp_date));

                                    if (!isNaN(timestamp)) {

                                        columns.push(value);
                                        column_valus.push(item_data);

                                    }
                                }
                            });
                            break;
                        default:

                            let id = google_excel_row_item.getKeyItemData('ID');
                            if (id == nickname) {
                                columns.forEach(function (value, index) {
                                    let damage = parseInt(google_excel_row_item.getKeyItemData(value).replace(/,/g, ""));
                                    let yesterday_damage = 0;
                                    let the_day_before_yesterday_damage = 0;

                                    //抓昨天的傷害值
                                    if (index > 1) {
                                        yesterday_damage = parseInt(google_excel_row_item.getKeyItemData(columns[index - 1]).replace(/,/g, ""));
                                        
                                        if (index > 2) {
                                            the_day_before_yesterday_damage = parseInt(google_excel_row_item.getKeyItemData(columns[index - 2]).replace(/,/g, ""));
                                        }
                                    }

                                    let calculation_damage = _this.calculationDamage(damage, yesterday_damage, the_day_before_yesterday_damage);

                                    let damage_increase                 = calculation_damage.now_damage_increase;
                                    let yesterday_damage_increase       = calculation_damage.yesterday_damage_increase;
                                    let yesterday_damage_proportion     = calculation_damage.damage_proportion;

                                    datas.push({ date: column_valus[index], damage: damage, is_update: (damage != yesterday_damage), yesterday_damage_proportion: yesterday_damage_proportion });
                                });
                            }
                    }
                });
            });

            return datas;

        } catch (e) {
            throw e;
        }

    };


    /**
     * 取得當日當下所有傷害資料
     * */
    this.getListNowDayDamge = async function () {
        let init = require(external_path + 'auth.json');
        let creds = require(external_path + init.google_creds);
        let { GoogleSpreadsheet } = require('google-spreadsheet');
        let GoogleExcel = require('./GoogleExcel.js');
        let publicFunction = require('./public_function.js');
        let public_function = new publicFunction();

        try {
            //先記錄當下時間
            let now_date = new Date();
            //設定時差
            now_date = public_function.setTimezone(now_date, init.time_difference);

            //new Google API物件
            let doc = new GoogleSpreadsheet(init.path);
            let google_excel = new GoogleExcel(doc, creds);
            //將時間往前推5小時(因為重置時間為白天5點)
            now_date.setHours(now_date.getHours() - 5);
            let now_y = now_date.getFullYear();

            //let damage_list_sheet = await google_excel.getSheet(init.damage_list_sheet_index);
            let damage_list_sheet = await google_excel.getSheet(6);

            try {
                var damage_list_sheet_promise = damage_list_sheet.getRows();
            } catch (e) {
                throw e;
            }

            let columns = [];
            let column_name = '';
            let lists = [];

            await damage_list_sheet_promise.then(function (damage_list_sheet_rows) {

                let headers = damage_list_sheet.getHeaders();
                
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
                                            let yesterday_damage = 0;
                                            let the_day_before_yesterday_damage = 0;

                                            //抓昨天的傷害值
                                            if (index > 1) {
                                                yesterday_damage = parseInt(google_excel_row_item.getKeyItemData(columns[index - 1]).replace(/,/g, ""));

                                                if (index > 2) {
                                                    the_day_before_yesterday_damage = parseInt(google_excel_row_item.getKeyItemData(columns[index - 2]).replace(/,/g, ""));
                                                }
                                            }

                                            let calculation_damage = _this.calculationDamage(damage, yesterday_damage, the_day_before_yesterday_damage);

                                            let damage_increase = calculation_damage.now_damage_increase;
                                            let yesterday_damage_increase = calculation_damage.yesterday_damage_increase;
                                            let yesterday_damage_proportion = calculation_damage.damage_proportion;

                                            lists.push({ id: id, damage: damage, is_update: (damage != yesterday_damage), yesterday_damage_proportion: yesterday_damage_proportion });
                                        }
                                    });
                                }
                            }
                    }
                });    
            });

            return lists;

        } catch (e) {
            throw e;
        }
    };

    /**
     * 取得指定日期所有傷害資料
     * @param {int} day
     */
    this.getListDayDamge = async function (day) {
        let init                    = require(external_path + 'auth.json');
        let creds                   = require(external_path + init.google_creds);
        let { GoogleSpreadsheet }   = require('google-spreadsheet');
        let GoogleExcel             = require('./GoogleExcel.js');
        let publicFunction          = require('./public_function.js');
        let public_function         = new publicFunction();

        //new Google API物件
        let doc             = new GoogleSpreadsheet(init.path);

        let google_excel    = new GoogleExcel(doc, creds);
        let datas           = [];

        try {

            //先記錄當下時間
            let now_date    = new Date();
            //設定時差
            now_date        = public_function.setTimezone(now_date, init.time_difference);
            let now_month   = now_date.getMonth() + 1;

            //let damage_list_sheet = await google_excel.getSheet(init.damage_list_sheet_index);
            let damage_list_sheet   = await google_excel.getSheet(6);

            try {

                try {
                    var damage_list_sheet_promise = damage_list_sheet.getRows();
                } catch (e) {
                    throw e;
                }

                await damage_list_sheet_promise.then(function (damage_list_sheet_rows) {

                    let columns = damage_list_sheet.getHeaders();
                    let column_index = '';

                    damage_list_sheet_rows.forEach(async function (google_excel_row_item, index) {

                        switch (index) {

                            case 0:

                                for (var i = 2; i < columns.length; i++) {
                                    let xls_header_name = google_excel_row_item.getKeyItemData(columns[i]);
                                    if (xls_header_name == now_month + '/' + day) {
                                        column_index = i;
                                        break;
                                    }
                                }

                                break;
                            default:

                                let id = google_excel_row_item.getKeyItemData('ID');
                                if (id != '') {
                                   
                                    let damage = parseInt(google_excel_row_item.getKeyItemData(columns[column_index]).replace(/,/g, ""));
                                    let yesterday_damage = 0;
                                    let the_day_before_yesterday_damage = 0;
                                    //抓昨天的傷害值
                                    if (column_index > 1) {
                                        yesterday_damage = parseInt(google_excel_row_item.getKeyItemData(columns[column_index - 1]).replace(/,/g, ""));
                                        if (column_index > 2) {
                                            the_day_before_yesterday_damage = parseInt(google_excel_row_item.getKeyItemData(columns[column_index - 2]).replace(/,/g, ""));
                                        }
                                    }

                                    let calculation_damage = _this.calculationDamage(damage, yesterday_damage, the_day_before_yesterday_damage);

                                    let damage_increase = calculation_damage.now_damage_increase;
                                    let yesterday_damage_increase = calculation_damage.yesterday_damage_increase;
                                    let yesterday_damage_proportion = calculation_damage.damage_proportion;

                                    datas.push({ id: id, damage: damage, is_update: (yesterday_damage_increase > 0), yesterday_damage_proportion: yesterday_damage_proportion});
                                }
                        }
                    });
                });

            } catch (e) {
                throw e;
            }

            return datas;
        } catch (e) {
            throw e;
        }
    }

    /**
     * 重置傷害表
     * */
    this.resetDamageExcel = async function () {
        let init = require(external_path + 'auth.json');
        let creds = require(external_path + init.google_creds);
        let { GoogleSpreadsheet } = require('google-spreadsheet');
        let GoogleExcel = require('./GoogleExcel.js');

        //new Google API物件
        let doc = new GoogleSpreadsheet(init.path);

        let google_excel = new GoogleExcel(doc, creds);

        try {
            //let damage_list_sheet = await google_excel.getSheet(init.damage_list_sheet_index);
	        let damage_list_sheet = await google_excel.getSheet(10);

            try {
                var damage_list_sheet_promise = damage_list_sheet.getRows();

                await damage_list_sheet_promise.then(function (damage_list_sheet_rows) {

                    let columns = damage_list_sheet.getHeaders();

                    damage_list_sheet_rows.forEach(async function (google_excel_row_item, index) {

                        if (index > 1) {
                            let id = google_excel_row_item.getKeyItemData('ID');

                            if (id != '') {
                                let code = parseInt('C'.charCodeAt());
                                columns.forEach(function (value, key) {

                                    switch (value) {
                                        case 'ID':
                                            google_excel_row_item.setValue(value, "='01月角色調查'!A" + (index + 2));
                                            break;
                                        case '':
                                            break;
                                        case 'a':
                                            google_excel_row_item.setValue(value, 0);
                                            break;
                                        default:
                                            google_excel_row_item.setValue(value, '=' + (String.fromCharCode(code)) + (index + 2));
                                            code++;
                                    }
                                });

                                try {
                                    await google_excel_row_item.save();
                                } catch (e) {
                                    throw e
                                }
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
    };

    /**
     * 重新開始新的活動及重置傷害表
     * @param {any} _month
     * @param {any} _s_day
     * @param {any} _e_day
     */
    this.damageActivityStart = async function (_month, _s_day, _e_day) {
        let month = parseInt(_month);
        let s_day = parseInt(_s_day);
        let e_day = parseInt(_e_day);
        if (isNaN(month) || isNaN(s_day) || isNaN(e_day)) {
            throw '傷害表單重置失敗，輸入的參數錯誤';
        } else if (s_day > e_day || s_day < 1 || e_day > 31 || (e_day - s_day) > 11) {
            throw '傷害表單重置失敗，起訖日期錯誤';
        } else if (month < 1 || month > 12) {
            throw '傷害表單重置失敗，月份錯誤';
        }
        
        let init = require(external_path + 'auth.json');
        let creds = require(external_path + init.google_creds);
        let { GoogleSpreadsheet } = require('google-spreadsheet');
        let GoogleExcel = require('./GoogleExcel.js');

        //new Google API物件
        let doc = new GoogleSpreadsheet(init.path);

        let google_excel = new GoogleExcel(doc, creds);

        try {

            //let damage_list_sheet = await google_excel.getSheet(init.damage_list_sheet_index);
            let damage_list_sheet = await google_excel.getSheet(10);

            try {
                var damage_list_sheet_promise = damage_list_sheet.getRows();

                await damage_list_sheet_promise.then(function (damage_list_sheet_rows) {

                    let headers = damage_list_sheet.getHeaders();
                    let init_day = s_day;
                    let columns = [];
                    damage_list_sheet_rows.forEach(async function (google_excel_row_item, index, array) {

                        switch (index) {
                            case 0:
                                headers.forEach(function (value, _index, array) {

                                    if (_index > 1) {

                                        let item_data = google_excel_row_item.getKeyItemData(value);

                                        if (item_data != 'Total') {

                                            if (init_day <= e_day) {
                                                google_excel_row_item.setValue(value, month + '/' + init_day);
                                            } else {
                                                google_excel_row_item.setValue(value, '');
                                            }
                                        }

                                        init_day++;

                                        columns.push(value);

                                    }

                                });

                                try {
                                    await google_excel_row_item.save();
                                } catch (e) {
                                    throw e
                                }
                                break;
                            case 1:
                                break;
                            default:
                                let id = google_excel_row_item.getKeyItemData('ID');

                                if (id != '') {
                                    let code = parseInt('C'.charCodeAt());
                                    columns.forEach(function (value, key) {

                                        switch (value) {
                                            case 'ID':
                                                google_excel_row_item.setValue(value, "='01月角色調查'!A" + (index + 2));
                                                break;
                                            case '':
                                                break;
                                            case 'a':
                                                google_excel_row_item.setValue(value, 0);
                                                break;
                                            default:
                                                google_excel_row_item.setValue(value, '=' + (String.fromCharCode(code)) + (index + 2));
                                                code++;
                                        }
                                    });

                                    try {
                                        await google_excel_row_item.save();
                                    } catch (e) {
                                        throw e;
                                    }
                                }
                        }
                    });
                });

                //更新設定檔裡的公會戰設定
                let webhook_init = require(external_path + 'webhook_init.json');
                let fs = require('fs');

                webhook_init.war_day = s_day + '-' + e_day;

                fs.writeFile(external_path + 'webhook_init.json', JSON.stringify(webhook_init), function (err) {
                    if (err) throw err;
                });

            } catch (e) {
                throw e;
            }

        } catch (e) {
            throw e;
        }
    }

    /**
     * 取得傷害值的計算結果
     * @param {int} _now_damage                         當下傷害
     * @param {int} _yesterday_damage                   當下的昨天傷害
     * @param {int} _the_day_before_yesterday_damage    當下的前天傷害
     */
    this.calculationDamage = function (_now_damage, _yesterday_damage, _the_day_before_yesterday_damage) {

        let now_damage = (isNaN(parseInt(_now_damage))) ? 0 : parseInt(_now_damage);
        let yesterday_damage = (isNaN(parseInt(_yesterday_damage))) ? 0 : parseInt(_yesterday_damage);
        let now_dama_the_day_before_yesterday_damagege = (isNaN(parseInt(_the_day_before_yesterday_damage))) ? 0 : parseInt(_the_day_before_yesterday_damage);

        let now_damage_increase = now_damage - yesterday_damage;
        let yesterday_damage_increase = yesterday_damage - now_dama_the_day_before_yesterday_damagege;

        let damage_proportion = 0;
        if (yesterday_damage_increase > 0) {
            damage_proportion = (Math.round(now_damage_increase / yesterday_damage_increase * 100, 2) - 100)
        }

        return { now_damage_increase: now_damage_increase, yesterday_damage_increase: yesterday_damage_increase, damage_proportion: damage_proportion};

    }

    /**
     * 搜尋 sheet 裡面的資料
     * @param {any} sheet
     * @param {any} _target_field
     * @param {any} _target_value
     */
    this.sheetSearchData = async function (sheet, _target_field, _target_value) {
        try {
            let sheet_promise = sheet.getRows();
            let result = null;
            await sheet_promise.then(function (sheet_rows) {
                for (var i = 0; i < sheet_rows.length; i++) {
                    let google_excel_row_item = sheet_rows[i];
                    let target_field_value = google_excel_row_item.getKeyItemData(_target_field);

                    if (target_field_value == _target_value) {
                        result = google_excel_row_item;
                    }
                }   
            });

            return result;

        } catch (e) {
            throw e;
        }

    }
}


module.exports = BotCommandBehavior;