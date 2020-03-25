'use strict';
exports = module.exports = function (_doc, _creds) {
    
    var doc = _doc;
    var creds = _creds;

    this.getSheet = async function(index)
    {
        try {
            var GoogleExcelSheet = require('./GoogleExcelSheet.js');

            await doc.useServiceAccountAuth(creds);
            await doc.loadInfo();

            return new GoogleExcelSheet(doc.sheetsByIndex[index]);
        } catch (e) {
            throw e;
        }
    }
};