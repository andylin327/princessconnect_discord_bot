'use strict';
exports = module.exports = function (_sheet) {
    var GoogleExcelRowItem = require('./GoogleExcelRowItem.js');

    var rows = null;

    var sheet = _sheet;
    var headers = [];

    /**
    * 取得活頁簿資料
    */
    this.getRows = async function()
    {
        if (rows == null) {
            try {
                if (rows == null) {
                    rows = await sheet.getRows();
                    headers = sheet.headerValues;
                }
            } catch (e) {
                throw e;
            }
        }

        var _rows = [];
        for (var i = 0; i < rows.length; i++) {
            
            if (rows[i] != undefined) {
                let a = new GoogleExcelRowItem(i, rows[i], headers);
                _rows[i] = a;
            }
        }

        return _rows;
    }

    this.getHeaders = function () {
        return headers;
    }

    this.getSheetObj = function () {
        return sheet;
    }
};