'use strict';
exports = module.exports = function (_index, _item, _headers) {

    var key = _headers;
    var value = [];
    var index = _index;
    var item = _item;
    var _this = this;

    for (var i = 0; i < key.length; i++) {
        value.push(item[key[i]]);
    }
   
    //console.log(value);
    this.getValue = function () {
        return value;
    }

    /**
     * ��header��name�Ө��o�����
     * @param {string} _key
     */
    this.getKeyItemData = function(_key) {
        let result = null;

        key.forEach(function (value, index, arr) {
            if (value == _key) {
                result = _this.getIndexItemData(index);
                return;
            }
        });

        return result;
    }

    /**
     * �� index ���o�����
     * @param {int} index
     */
    this.getIndexItemData = function(index) {
        if (value[index] != undefined) {
            return value[index];
        }

        return null;
    }

    /**
     * �x�s
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
     * �ˬd key �O�_�s�b
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