// Bot Ayarları
const config = require('./config.json');
// Discord.js kütüphanesi
const Discord = require('discord.js');
const client = new Discord.Client();

// reQuest
const request = require('request');

// Resim işlemleri
const mergeImages = require('merge-images');
const Canvas = require('canvas');
//const base64ToImage = require('base64-to-image');

// Dosya kaydetme işlemleri
const fs = require("fs");
const fse = require("fs-extra"); // Dosyaları silmek için
const saveFile = require('image-downloader');

Canvas.registerFont( 'data/LSANS.ttf', { family: "LSANS" } );

var exportPath ='exportImage/';

var imgUrl = "https://render.albiononline.com/v1/item/";
var emptyUrl = "data/emptyImg.png";

var lastRecordedKill = -1;

function dFormatter(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") || 0;
}

if (typeof config !== 'undefined') {
    var playerNames = [];
    for (var i = 0; i < config.players.length; i++) {
        playerNames.push(config.players[i].toLowerCase())
    }
}

function fetchKills(limit = 50, offset = 0) {
    request({
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0',
            'Content-Type' : 'application/x-www-form-urlencoded'
        },
        uri: 'https://gameinfo.albiononline.com/api/gameinfo/events?limit=' + limit + '&offset=' + offset,
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            console.log("Start - 1 | "+new Date(Date.now()))
            parseKills(body);
        } else {
            console.log('Error no data:' +new Date(Date.now()) );
            //fetchKills();
        }
    });
}

function parseKills(events) {
    var breaker = lastRecordedKill;

    events.some(function (kill, index) {
        var count;
        if (index == 0) {
            lastRecordedKill = kill.EventId;
        }

        if (kill.EventId != breaker) {
            if (kill.Killer.AllianceName == config.allianceName || kill.Victim.AllianceName == config.allianceName) {
                console.log("Ölüm İşleme - 3-1");
                postKill(kill);
            } else if (kill.Killer.GuildName == config.guildName || kill.Victim.GuildName == config.guildName) {
                console.log("Ölüm İşleme - 3-2");
                postKill(kill);
            } else if (kill.Killer.GuildName == config.guildName2 || kill.Victim.GuildName == config.guildName2) {
                console.log("Ölüm İşleme - 3-3");
                postKill(kill);
            }else if (playerNames.includes(kill.Killer.Name) || playerNames.includes(kill.Victim.Name)) {
                console.log("Ölüm İşleme - 3-4");
                postKill(kill);
            }

        } else {
            count++;
        }
        return kill.EventId == breaker;
    });
}

function controlImage(value){
    var controlImagePath = "./itemNew/";
    if(value != "" && value != null){
        controlImageFile = value.Type+"-q"+value.Quality+".png";
        try {
            if (fs.existsSync(controlImagePath+controlImageFile)) {
                return controlImagePath+controlImageFile;
            }else{
                download(imgUrl+""+value.Type+"?quality="+value.Quality, controlImagePath+value.Type+"-q"+value.Quality+".png", function(){
                    return controlImagePath+controlImageFile;
                });
                return imgUrl+""+value.Type+"?quality="+value.Quality;
            }
        } catch(err) {
            console.error(err)
        }
    }else{
        return emptyUrl;
    }
}


var download = function(uri, filename, callback){
    options = {
    url: uri,
    dest: filename
    }

    saveFile.image(options)
    .then(({ filename, image }) => {
        return true;
    })
    .catch((err) => console.error(err))

}

function createEnvanter(number, envanterItems, killId, height){
    number;
    envanterItems;
    width = 1716;

    var arkaplan = "data/envanterBack-"+number+".jpg";

    mergeImages(envanterItems , {
        width: width,
        height: height,
        Canvas: Canvas,
        Image: Image
    })
    .then((b64) => {
        base64Data = b64.replace(/^data:image\/png;base64,/, "");
        fs.writeFile("exportImage/"+killId+"-env.png", base64Data, 'base64', function (err) {});
    });

}

async function postKill(kill, channel = config.botChannel) {

    if (kill.TotalVictimKillFame == 0) {
        return;
    }

    var victory = false;
    if (kill.Killer.AllianceName == config.allianceName
        || kill.Killer.GuildName == config.guildName
        || kill.Killer.GuildName2 == config.guildName2
        || config.players.includes(kill.Killer.Name)) {
        victory = true;
    }

    var killerItem = kill.Killer.Equipment;
    var victimItem = kill.Victim.Equipment;
    var victimEnvanter = kill.Victim.Inventory;

    var killerItemImg = [];
    var victimItemImg = [];
    var envanterItems = [];

    for (let [key, value] of Object.entries(killerItem)) {
        if( value != null){
            killerItemImg[key] = controlImage(value);
        }else{
            killerItemImg[key] = emptyUrl;
        }
    }

    for (let [key, value] of Object.entries(victimItem)) {
        if( value != null){
            victimItemImg[key] = controlImage(value);
        }else{
            victimItemImg[key] = emptyUrl;
        }
    }

    var canvas = Canvas.createCanvas(800, 489);
    var ctx = canvas.getContext('2d');

    const background = await Canvas.loadImage('data/albionback.jpg');
    ctx.drawImage(background, 0, 0, 800 ,489);

    var b64;
    var base64Data;

    ctx.fillStyle = '#2b201c'

    ctx.font = "17px ";
    ctx.textAlign = "center";

    ctx.fillText(kill.Killer.Name, 154, 45);
    ctx.fillText((kill.Killer.AllianceName ? "[" + kill.Killer.AllianceName + "] " : '') + (kill.Killer.GuildName ? kill.Killer.GuildName : ''), 154, 70);
    ctx.fillText('Ip: '+Math.round(kill.Killer.AverageItemPower), 250, 450 );

    ctx.fillText(kill.Victim.Name, 648,45);
    ctx.fillText((kill.Victim.AllianceName ? "[" + kill.Victim.AllianceName + "] " : '') + (kill.Victim.GuildName ? kill.Victim.GuildName : ''), 648,70);
    ctx.fillText('Ip: '+Math.round(kill.Victim.AverageItemPower), 550, 450 );

    ctx.fillStyle = "rgba(22, 22, 22, 0.5)";
    ctx.fillText("y2n.me", 400, 125);
    ctx.fillStyle = '#2b201c';

    if (kill.numberOfParticipants != 1) {
        var textWidth = 400, textHeight=150;
        kill.Participants.forEach(function (participant) {
            if (participant.Name != kill.Killer.Name) {
              if(participant.DamageDone != 0){
                ctx.fillStyle = "red";
                ctx.fillText(participant.Name+": "+Math.round(participant.DamageDone), textWidth , textHeight);
              }

              if(participant.DamageDone == 0 && participant.SupportHealingDone != 0){
                ctx.fillStyle = "green";

                ctx.fillText(participant.Name+": "+Math.round(participant.SupportHealingDone), textWidth , textHeight);
              }

              textHeight = textHeight+25;
            }
        })
    }

    ctx.fillStyle = "#2b201c";
    ctx.fillText(dFormatter(kill.TotalVictimKillFame), 400, 290);

    var killDate = kill.TimeStamp;

    killDate = killDate.split("T");
    killTime = killDate[1].split(".");
    killTime = killTime[0];
    killDate = killDate[0];

    ctx.fillText(killDate, 400, 400 );
    ctx.fillText(killTime,400,425)

    ctx.font = "7px Nizzoli";
    ctx.fillStyle = "rgba(22, 22, 22, 0.3)";
    ctx.fillText("y2n.me", 400, 460);
    ctx.fillText(kill.EventId, 400, 475);


    /* Katil */

    const killerBag = await Canvas.loadImage(killerItemImg.Bag);
    ctx.drawImage(killerBag, 1, 101, 108, 108);

    const killerHead = await Canvas.loadImage(killerItemImg.Head);
    ctx.drawImage(killerHead, 100, 88, 108, 108);

    const killerCape = await Canvas.loadImage(killerItemImg.Cape);
    ctx.drawImage(killerCape, 200, 101, 108, 108);

    const killerMainHand = await Canvas.loadImage(killerItemImg.MainHand);
    ctx.drawImage(killerMainHand, 1, 200, 108, 108);

    const killerArmor = await Canvas.loadImage(killerItemImg.Armor);
    ctx.drawImage(killerArmor, 100, 188, 108, 108);

    const killerOffHand = await Canvas.loadImage(killerItemImg.OffHand);
    ctx.drawImage(killerOffHand, 200, 200, 108, 108);

    const killerFood = await Canvas.loadImage(killerItemImg.Food);
    ctx.drawImage(killerFood, 1, 299, 108, 108);

    const killerShoes = await Canvas.loadImage(killerItemImg.Shoes);
    ctx.drawImage(killerShoes, 100, 285, 108, 108);

    const killerPotion = await Canvas.loadImage(killerItemImg.Potion);
    ctx.drawImage(killerPotion, 200, 299, 108, 108);

    const killerMount = await Canvas.loadImage(killerItemImg.Mount);
    ctx.drawImage(killerMount, 100, 384, 108, 108);

    /* Merhum */

    const victimBag = await Canvas.loadImage(victimItemImg.Bag);
    ctx.drawImage(victimBag, 500, 101, 108, 108);

    const victimHead = await Canvas.loadImage(victimItemImg.Head);
    ctx.drawImage(victimHead, 598, 88, 108, 108);

    const victimCape = await Canvas.loadImage(victimItemImg.Cape);
    ctx.drawImage(victimCape, 696, 101, 108, 108);

    const victimMainHand = await Canvas.loadImage(victimItemImg.MainHand);
    ctx.drawImage(victimMainHand, 500, 200, 108, 108);

    const victimArmor = await Canvas.loadImage(victimItemImg.Armor);
    ctx.drawImage(victimArmor, 598, 188, 108, 108);

    const victimOffHand = await Canvas.loadImage(victimItemImg.OffHand);
    ctx.drawImage(victimOffHand, 696, 200, 108, 108);

    const victimFood = await Canvas.loadImage(victimItemImg.Food);
    ctx.drawImage(victimFood, 500, 299, 108, 108);

    const victimShoes = await Canvas.loadImage(victimItemImg.Shoes);
    ctx.drawImage(victimShoes, 598, 285, 108, 108);

    const victimPotion = await Canvas.loadImage(victimItemImg.Potion);
    ctx.drawImage(victimPotion, 696, 299, 108, 108);

    const victimMount = await Canvas.loadImage(victimItemImg.Mount);
    ctx.drawImage(victimMount, 598, 384, 108, 108);

    b64 = canvas.toDataURL();
    base64Data = b64.replace(/^data:image\/png;base64,/, "");

    fs.writeFile("exportImage/"+kill.EventId+"-char.png", base64Data, 'base64', function (err) {
        if(err == null){
            const file = new Discord.Attachment('./exportImage/'+kill.EventId+'-char.png');

            var embed = {
                color: victory ? 0x008000 : 0x800000,
                author: {
                    name: kill.Killer.Name + " killed " + kill.Victim.Name,
                    icon_url: victory ? 'https://i.imgur.com/CeqX0CY.png' : 'https://albiononline.com/assets/images/killboard/kill__date.png',
                    url: 'https://albiononline.com/en/killboard/kill/' + kill.EventId
                },
                title: kill.Killer.Name + " killed " + kill.Victim.Name,
                description: 'Fame: ' + dFormatter(kill.TotalVictimKillFame),
                image: {
                url: 'attachment://'+kill.EventId+'-char.png',
                },
                /*
                thumbnail: {
                    url:
                },
                */
                timestamp: kill.TimeStamp,

                footer: {
                text: 'Beta: v1.3.0\nBu bot y2n tarafından yazıldı; https://y2n.me \nTime',
                icon_url: 'https://i.imgur.com/sx5pBcg.png',
                }
            };
            client.channels.get(channel).send({
                    files: [file], embed: embed
            });
            console.log("Event Last Image: "+kill.EventId);
        }
    });

}



function clearImg() {
  var timeZone = Date.now()
  var dateNow = new Date(timeZone);
  var hours = dateNow.getHours();
  var min = dateNow.getMinutes();
  if(hours == 10 && min == 09){
    fse.emptyDir('./exportImage', err => {
      if (err) return console.error(err)

      console.log('Export Folder is CLEAR!')
    })
  }
}

if (typeof client !== 'undefined') {
    client.on('ready', () => {

        console.log('Start!');

        if (client.user.username != config.username) {
            client.user.setUsername(config.username);
        }

        client.user.setActivity(config.playingGame); // broken due to discord API changes
        fetchKills();

        var timer = setInterval(function () {
            fetchKills();
            clearImg();
        }, 30000);
    });
}

if (typeof client !== 'undefined') {
    client.on('message', message => {
        if (message.content.indexOf(config.cmdPrefix) !== 0 || message.author.bot) return;
        else { // Execute command!
            var args = message.content.slice(config.cmdPrefix.length).trim().split(/ +/g);
            var command = args.shift().toLowerCase();


            if (command === 'clear') {
                if (config.admins.includes(message.author.id) && message.channel.id == config.botChannel) {
                    message.channel.send('Cleaning...').then(msg => {
                        msg.channel.fetchMessages().then(messages => {
                            message.channel.bulkDelete(messages);
                            console.log("[ADMIN] " + message.author.username + " cleared Killboard");
                        })
                    })
                }
            }



        }
    });
}

if (typeof config !== 'undefined') {
    if (config.token) {
        client.login(config.token);
    } else {
        console.log("ERROR: No bot token defined")
    }
} else {
    console.log("ERROR: No config file")
}
