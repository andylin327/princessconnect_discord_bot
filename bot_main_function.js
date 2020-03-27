'use strict';
const external_path = '../Re_Dive_BOT/';

function botMainFunction() {

    this.resetDamageExcel = async function () {
        let init = require(external_path + 'auth.json');
        let creds = require(external_path + init.google_creds);
        let { GoogleSpreadsheet } = require('google-spreadsheet');
        let GoogleExcel = require('./GoogleExcel.js');

        //new Google API物件
        let doc = new GoogleSpreadsheet(init.path);

        let google_excel = new GoogleExcel(doc, creds);

        try {
            let damage_list_sheet = await google_excel.getSheet(init.damage_list_sheet_index);

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

            let damage_list_sheet = await google_excel.getSheet(init.damage_list_sheet_index);
            
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

}


module.exports = botMainFunction;