const external_path     = '../Re_Dive_BOT/';
const request           = require("request");
const cheerio           = require("cheerio");
const fs                = require("fs");
const CronJob           = require('cron').CronJob;
const webhook_init      = require(external_path + 'webhook_3_init.json');
const Discord           = require('discord.js');
const init              = require(external_path + 'auth.json');
const shook              = new Discord.WebhookClient(webhook_init.webhook_id, webhook_init.webhook_token);
//const publicFunction    = require('./public_function.js');
const BotCommandBehavior   = require('./BotCommandBehavior.js');
const bot_command_behavior = new BotCommandBehavior();
const domain            = 'http://www.princessconnect.so-net.tw/';

console.log('Official News Push webhook_3.js Ready');

new CronJob('0 0 8-20 * * *',async  function () {

    try {
        //刪除暫存
        delete require.cache[require.resolve(external_path + 'news_push_list.json')];
        var news_push_list = require(external_path + 'news_push_list.json');

        request({
            url: domain + "/news", // 官網最新消息列表
            method: "GET"
        }, async function (error, response, body) {
                if (error) {
                    console.log(error);
                    throw error;
                } else if (!body) {
                    console.log('沒有 body');
                    throw domain + '/news 沒有 body';
                }
               
                const $ = cheerio.load(body, { decodeEntities: false });
                const news_list_dom = $(".news_con dd a");

                news_list_dom.each(async function () {

                    let news_id = parseInt($(this).attr('href').slice(17));

                    if (!isNaN(news_id)) {

                        let list_title = $(this).text();
                        
                        let local_news_data_index = getLocalNewsDataIndex(news_push_list, news_id);

                        if (local_news_data_index == null || news_push_list[local_news_data_index].title != list_title) {
                            await request({
                                url: domain + "news/newsDetail/" + news_id, //新聞詳細頁
                                method: "GET"
                            }, await function (error, response, body) {
                                    
                                    if (error) {
                                        console.log(error);
                                        throw error;
                                    } else if (!body) {
                                        console.log(domain + 'news/newsDetail/' + news_id + ' 沒有 body');
                                        throw domain + 'news/newsDetail/' + news_id+' 沒有 body';
                                    }

                                    let $ = cheerio.load(body);
                                    let dom = $(".news_con");
                                    
                                    let news_date = dom.find('h2').eq(0).text();
                                    news_date = news_date.replace(/\n/g, "");

                                    let title = '\n\n\n' + dom.find('h3').eq(0).text();
                                    let tag = '';
                                    if (title.indexOf('戰隊') != -1) {
                                        tag += '<@&482220478551818251>';
                                    } else if (title.indexOf('維護') != -1) {
                                        tag += '<@&482220478551818251>';
                                    }

                                    let content_dom = dom.find('section').eq(0);
                                    content_dom.find('h4').remove();

                                    var p_i = 0;
                                    content_dom.find('p').each(function (i, v) {
                                        let content = $(this).text().replace(/ /g, "").replace(/    /g, "").replace(/&nbsp;/g, "");
                                        if (content == '') {
                                            content_dom.find('p').eq(p_i).remove();
                                        } else {
                                            p_i++;
                                        }
                                    });

                                    var div_i = 0;
                                    content_dom.find('div').each(function (i, v) {
                                        let content = $(this).text().replace(/ /g, "").replace(/    /g, "").replace(/&nbsp;/g, "");
                                        
                                        if (content == '') {
                                            content_dom.find('div').eq(div_i).remove();
                                        } else {
                                            div_i++;
                                        }
                                    });

                                    let content = content_dom.html().trim();
                                    content = content.replace(/\n/g, "");
                                    content = content.replace(/<br>/g, "\n");
                                    content = content.replace(/    /g, "");
                                    content = content.replace(/&nbsp;/g, "");

                                    content = $('<div />').html(content).text();
                                    let message = news_date + title + '\n';
                                    message += domain + 'news/newsDetail/' + news_id + '\n';

                                    message += tag +'\n';

                                    let message_sub = content.substring(0, 500);
                                    let message_len = content.length;
                                    message += '```\n';
                                    message += message_sub + '\n';

                                    if (message_len > 500) {
                                        message += '......\n';
                                    }

                                    message += '```';

                                    if (local_news_data_index == null) {
                                        news_push_list.push({ id: news_id, title: list_title });
                                    } else {
                                        news_push_list[local_news_data_index].title = list_title;
                                    }

                                    fs.writeFile(external_path + 'news_push_list.json', JSON.stringify(news_push_list), 'UTF8', function (err) {
                                        if (err) throw err;
                                    });

                                    shook.send(message);

                                    //公會戰預告發布就重置傷害表
                                    if (webhook_init.is_auto_update_damage_xls) {
                                        if (title.indexOf('月戰隊競賽》開幕預告') != -1) {
                                            let str_s = content.indexOf('【活動期間】') + 6;
                                            let str_e = content.indexOf('【活動內容】');
                                            let str_date = content.substring(str_s, str_e);
                                            str_date = str_date.replace(/\n/g, "").replace(/ ~ /g, "~");

                                            let str_datas = str_date.split('~');
                                            let month = 0;
                                            let s_day = 0;
                                            let e_day = 0;
                                            str_datas.forEach(function (v, i) {
                                                let s_t1 = v.split(' ');
                                                let s_t2 = s_t1[0].split('/');

                                                month = parseInt(s_t2[0]);

                                                switch (i) {
                                                    case 0:
                                                        s_day = parseInt(s_t2[1]);
                                                        break;
                                                    case 1:
                                                        e_day = parseInt(s_t2[1]);
                                                        break;
                                                }
                                            });

                                            bot_command_behavior.damageActivityStart(month, s_day, e_day);
                                        }
                                    }
                            });
                        }
                    }
                });
        });
    } catch (e) {
        console.log('----------------Error----------------');
        console.log(e);
        public_function.writeErrorLog(e, init.time_difference, external_path, 'webhook_3.js');

    }
}, null, true, 'Asia/Taipei');

function getLocalNewsDataIndex(list, _id) {

    let list_count = list.length;

    for (var i = 0; i < list_count; i++) {
        if (list[i].id == _id) {
            return i;
        }
    }

    return null;
}