//Discord libs
const { Client, Intents, MessageEmbed} = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
require('dotenv').config();
const {token, general, placement, guildId, keygen} = JSON.parse(process.env.DISCORD_CONFIG);
var bot_ready = false;
const db = require('./dbConn');
const { authorize, listMessages, syncMail, genToken, getUrl} = require('./gmailAPI');
const server = new db();


var mails = []
let last_deleted = false;

var token_active;

client.on('ready',()=>{
    console.log("Bot ready");
    client.channels.fetch(general).then(channel => channel.send("Bot Activated"));
    bot_ready = true;
    if(mails.length)
        sendMail();
})

client.on('interactionCreate', async interaction =>{
    if(!interaction.isCommand()) return;
    const {commandName} = interaction;
    if(commandName === "ping") interaction.reply("Pong");
    if(commandName === "register"){
        var data = interaction.options.getString('data');
        let parsed_data = data.split(',');
        if(parsed_data.length !== 3){
            await interaction.reply("Please re enter the command with comma seperated values in the shown order");
            console.log(parsed_data);
        }
        else {
            await interaction.deferReply();
            const obj = {
                name: parsed_data[0].trim(),
                regno: parsed_data[2].trim(),
                cgpa: parsed_data[1].trim()
            }
            console.log(obj);
            let result = server.storeData(obj);
            result.then(async () => {
                await interaction.editReply("Successfully Registered "+data);
            }).catch(async err => {
                if(err.code === '23505'){
                    await interaction.editReply("User already registered");
                } else {
                    await interaction.editReply("Error occured ");
                    console.log(err);
                }
            })

        }
    }
    if(commandName === "list"){
        let user = interaction.member.user;
        await interaction.deferReply();
        let result = server.getList();
        result.then( companies =>{
            console.log(companies.rows);
            if(companies.rows.length === 0){
                interaction.editReply("All registration deadlines expired");
                return;
            }
            interaction.editReply("List sent in private");
            companies.rows.forEach(row =>{
                console.log(row);
                let embed = createEmbed(row);
                user.send({embeds:[embed]});
            })
        }).catch(err => {
            console.log(err);
            interaction.editReply("Command execution failed check logs");
        })
    }
    if(commandName === "sync"){
        let id = interaction.guildId;
        if(id !== guildId){
            interaction.reply("This command can only be used in test server");
            console.log(id+" "+guildId);
        }
        else { 
            try {
                await interaction.deferReply()
                // let content = fs.readFileSync('./Keys/credentials.json');
                // let content = process.env.GMAIL_API;
                let auth = await authorize(server).catch(err => {
                    console.log(err);
                    throw -2;
                })
                // let auth = await accountAuth();
                console.log("Syncing mail");
                let last_id = await server.getRecent().catch(err => console.log(err));
                console.log(last_id.rows);
                var mails;
                if(last_id.rowCount === 0) mails = await syncMail(auth, undefined)
                else  mails = await syncMail(auth, last_id.rows[0].id);
                let fail_count = 0
                mails.forEach(async mail =>{
                    await server.storeCompany(mail).catch(err =>{
                       console.log(err);
                        fail_count = fail_count + 1;
                    });
                    client.channels.fetch(placement).then(channel => {
                        if(mail !== undefined)
                            channel.send({embeds: [createEmbed(mail)]});
                    })
                })
                interaction.editReply("Execution complete. Failed: "+fail_count);
                checkTime();
            } catch (error) {
                console.log('Error loading client secret file:', error);  
                interaction.editReply("Execution of command failed");
            }
        }

    }
    if(commandName === "renew"){
        if(interaction.guildId !== guildId) interaction.reply("Invalid Server");
        if(interaction.channelId !== keygen) interaction.reply("Invalid channel");
        const auth_dets = getUrl();
        const filter = code => {
            try {
                console.log(code.content);
                genToken(code.content, syncMail, auth_dets.client,server)    
                return true;
            } catch (error) {
                console.log(error);
                return false;
            }
        }
        interaction.reply(auth_dets.url, {fetchReply:true})
        .then(() => {
            interaction.channel.awaitMessages({filter, max:1, time: 300000, errors:['time',]})
            .then(collected => {
                interaction.followUp("Successful");
                token_active = true;
            }).catch(err => {
                interaction.followUp("Failure");
                console.log(err);
            })
        })
    }
})
function sendAdmin(init = true){
    if(!token_active && init)
        return;
    console.log(keygen);
    client.channels.fetch(keygen).then(channel => {
        channel.send("Token Expired, Renew Token using renew command");
    })
}
function sendMail(mail = undefined){
    if(mail !== undefined){
        server.storeCompany(mail).catch(err => {
            console.log(err);
        });
    }
    if(!bot_ready){
        mails.push(mail);
        return;
    }   
    if(typeof mail === 'object')
        client.channels.fetch(placement).then(channel => {
            if(mails.length){
                mails.forEach(_mail => {
                    channel.send({embeds: [createEmbed(_mail)]});
                });
            }
            if(mail !== undefined)
                channel.send({embeds: [createEmbed(mail)]});
        })
    else 
        client.channels.fetch(placement).then(channel => {
            channel.send(mail);
        });
}

function createEmbed(_mail){
    var deads;
    if(_mail.deadline && typeof _mail.deadline !== 'string'){
        console.log(_mail.deadline);
        deads = new Date(_mail.deadline).toLocaleString('en-US',{timeZone:"IST"});
    }
    else
        deads = _mail.deadline || _mail.Deadline;
    if(_mail.branches !== undefined){
        if (_mail.branches.length > 1024){
            let sub = _mail.branches.slice(0, 900);
            sub = sub + "\n....more items below check mail";
            _mail.branches = sub;
        }
    } else {
        if (_mail.Branches.length > 1024){
            let sub = _mail.Branches.slice(0, 900);
            sub = sub + "\n....more items below check mail";
            _mail.Branches = sub;
        }
    }
    if(_mail.name !== undefined){
        const embed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle(_mail.name)
                        .setDescription(_mail.category)
                        .addFields(
                            {name:"DOV", value:_mail.dov},
                            {name:"CGPA", value:_mail.cgpa.split(',').join('\n')},
                            {name:"Branches", value:_mail.branches.split(',').join('\n')},
                            {name:"Stipend", value:_mail.stipend.split(',').join('\n')},
                            {name:"CTC", value:_mail.ctc.split(',').join('\n')},
                            {name:"Deadline", value:deads.toString()},
                        )
        return embed;
    } else {
        const embed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle(_mail.Name)
                        .setDescription(_mail.Category)
                        .addFields(
                            {name:"DOV", value:_mail.DOV},
                            {name:"CGPA", value:_mail.CGPA.split(',').join('\n')},
                            {name:"Branches", value:_mail.Branches.split(',').join('\n')},
                            {name:"Stipend", value:_mail.Stipend.split(',').join('\n')},
                            {name:"CTC", value:_mail.CTC.split(',').join('\n')},
                            {name:"Deadline", value:deads.toString()},
                        )
        return embed;
    }
}
init();
async function init(){
    console.log("Started");
    await client.login(token);    //Discord
    try{
        server.connect();  //DBserver
        if(!token_active) sendAdmin(false);
        let last_fetched = server.getRecent();
        last_fetched.then( res => {
            if(!token_active) return;
            var result;
            if(res.rowCount === 0){
                result = getMail(undefined);
            }    
            else result = getMail(res.rows[0].id);
            if(result === -1)
                return;
            result.then(mails => {mails.forEach(mail => {
                    sendMail(mail);
                    console.log("Mail sent");
                })
            }).catch(err => console.log(err));
        }).catch( err => {
            console.log(err);
        })
            
        setInterval( () => {
            server.getRecent().then( res =>{
                console.log("Polling");
                var result;
                if( res.rowCount === 0){
                    result = getMail(undefined);
                }
                else result = getMail(res.rows[0].id);
                if(result === -1){
                    sendAdmin();
                    token_active = false;
                    return;
                }
                result.then(mails => {mails.forEach(mail => {
                        sendMail(mail);
                        console.log("Mail sent");
                    })
                }).catch(err => console.log(err));
                checkTime();
            }).catch(err => {
                console.log(err);
            })
        }, 900000);
        
    }catch(e){
        
        console.log(e);
    }
}
async function getMail(last_fetched){
    try {
        // let content = fs.readFileSync('./Keys/credentials.json');
        let auth = await authorize(server).catch(err => {
            console.log(err);
            throw "Authorization failed";
        })
        if(auth === -1)
            return -1;
        console.log("Getting mail");
        return await listMessages(auth, last_fetched);
        
    } catch (error) {
        console.log('Error loading client secret file:', error);  
      }
}
function checkTime(last_deleted){
    let time = new Date();
    if(time.getHours() === 20){
        if(!last_deleted){
            server.deleteExpired().then(() =>{
                last_deleted = true;
                console.log("Expired deleted");
            }).catch(err => {
                console.log(err);
            });
        }
    } else {
        if(last_deleted)
            last_deleted = false;
    }
}