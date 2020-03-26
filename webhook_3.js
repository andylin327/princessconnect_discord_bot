const external_path     = '../Re_Dive_BOT/';
const request           = require("request");
const cheerio           = require("cheerio");
const fs                = require("fs");
const CronJob           = require('cron').CronJob;
const webhook_init      = require(external_path + 'webhook_3_init.json');
const Discord           = require('discord.js');
const hook              = new Discord.WebhookClient(webhook_init.webhook_id, webhook_init.webhook_token);
const publicFunction    = require('./public_function.js');
const public_function   = new publicFunction();
const domain            = 'http://www.princessconnect.so-net.tw/';

console.log('Official News Push webhook_3.js Ready');

new CronJob('0 0 8-20 * * *',async  function () {

    try {
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
                //console.log(news_push_list);
                news_list_dom.each(async function () {

                    let news_id = parseInt($(this).attr('href').slice(17));
                    if (!isNaN(news_id)) {

                        if (!hasNewsId(news_push_list, news_id)) {
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

                                    let title = '\n' + dom.find('h3').eq(0).text();
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
                                            content_dom.find('p').eq(p_i).remove()
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

                                    //content_dom.find('p').eq(0).remove();
                                    //content_dom.find('div').eq(0).remove();
                                    //content_dom.find('div').eq(0).remove();

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

                                    let json_obj = { id: news_id };
                                    news_push_list.push(json_obj);

                                    fs.writeFile(external_path + 'news_push_list.json', JSON.stringify(news_push_list), function (err) {
                                        if (err) throw err;
                                    });

                                    hook.send(message);
                            });
                        }
                    }
                });
        });
    } catch (e) {
        console.log('----------------Error----------------');
        console.log(e);
        public_function.writeErrorLog(e, init.time_difference, external_path);

    }
}, null, true, 'Asia/Taipei');


function hasNewsId(list, _id) {

    let result = false;
    let list_count = list.length;

    for (var i = 0; i < list_count; i++) {
        let id = list[i].id;
        if (id == _id) {
            result = true;
            break;
        }
    }

    return result;
}