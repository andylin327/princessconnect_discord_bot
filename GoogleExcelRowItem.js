'use strict';
exports = module.exports = function (_index, _item, _headers) {

    var key = _headers;
    var value = [];
    var old_value = [];
    var index = _index;
    var item = _item;
    var _this = this;

    for (var i = 0; i < key.length; i++) {
        value.push(item[key[i]]);
        old_value.push(item[key[i]]);
    }

    /**
     * 用header的name來取得欄位資料
     * @param {string} _key
     */
    this.getKeyItemData = function (_key) {
        let result = null;

        key.forEach(function (value, index, arr) {
            if (value == _key) {
                result = _this.getIndexItemData(index);
                return;
            }
        });

        return result;
    }
   
    this.getValue = function () {
        return value;
    }

    this.getOldValue = function () {
        return old_value;
    }

    /**
     * 用 index 取得欄位資料
     * @param {int} index
     */
    this.getIndexItemData = function(index) {
        if (value[index] != undefined) {
            return value[index];
        }

        return null;
    }

    /**
     * 儲存
     * */
    this.save = async function (_key) {
        if (_key == undefined) {

            key.forEach(function (value, index) {
                item[value] = _this.getKeyItemData(value);
            });
            await item.save();
        } else {
            if (_this.hasKey(_key)) {
                item[_key] = _this.getKeyItemData(_key);
                await item.save();
            }
        }
        
    }

    this.setValue = function(_key, _value) {
        key.forEach(function (_fe_value, _fe_index) {
            if (_fe_value == _key) {
                value[_fe_index] = _value
            }
        });
    }

    /**
     * 檢查 key 是否存在
     * @param {any} _key
     */
    this.hasKey = function (_key) {
        for (var i = 0; i < key.length; i++) {
            if (key[i] == _key) {
                return true;
            }
        }
        return false;
    }

    this.getKeys = function () {
        return key;
    }
};