//Discord libs
const { Client, Intents, MessageEmbed} = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
require('dotenv').config();
const {token, general, placement, me, guildId} = JSON.parse(process.env.DISCORD_CONFIG);
// const {token, general, placement, me} = require('./Keys/config.json');
var bot_ready = false;
const db = require('./dbConn');
const { authorize, listMessages, syncMail } = require('./gmailAPI');
const server = new db();
const fs = require('fs');

var mails = []

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
                let content = process.env.GMAIL_API;
                let auth = await authorize(JSON.parse(content), syncMail).catch(err => {
                    console.log(err);
                    throw -2;
                })
                console.log("Syncing mail");
                let mails = await syncMail(auth);
                let fail_count = 0
                mails.forEach(async mail =>{
                   let result = await server.storeCompany(mail).catch(err =>{
                       console.log(err);
                        fail_count = fail_count + 1;
                    });
                })
                interaction.editReply("Execution complete. Failed: "+fail_count);
            } catch (error) {
                console.log('Error loading client secret file:', error);  
                interaction.editReply("Execution of command failed");
            }
        }

    }
})
function sendMail(mail = undefined){
    if(mail !== undefined){
        
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

function sendAdmin(data){
    client.channels.fetch(me).send(data);
}

function createEmbed(_mail){
    var deads;
    if(_mail.deadline && typeof _mail.deadline !== 'string')
        deads = new Date(_mail.deadline).toLocaleString('en-US',{timeZone:"IST"});
    else
        deads = _mail.deadline || _mail.Deadline;
    if(_mail.branches !== undefined)
        if (_mail.branches.length > 1024){
            let sub = _mail.branches.slice(0, 900);
            sub = sub + "\n....more items below check mail";
            _mail.branches = sub;
        }
    const embed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle(_mail.name || _mail.Name)
                    .setDescription(_mail.category || _mail.Category)
                    .addFields(
                        {name:"DOV", value:_mail.dov ||_mail.DOV},
                        {name:"CGPA", value:_mail.cgpa.split(',').join('\n') ||_mail.CGPA.split(',').join('\n')},
                        {name:"Branches", value:_mail.branches.split(',').join('\n') ||_mail.branches.split(',').join('\n')},
                        {name:"Stipend", value:_mail.stipend.split(',').join('\n') ||_mail.Stipend.split(',').join('\n')},
                        {name:"CTC", value:_mail.ctc.split(',').join('\n') ||_mail.CTC.split(',').join('\n')},
                        {name:"Deadline", value:deads.toString()},
                    )
    return embed;
}
init();
function init(){
    console.log("Started");
    let last_update = undefined;
    client.login(token);    //Discord
    try{
        server.connect();  //DBserver
        if(last_update === undefined){
            let result = getMail(last_update);
            last_update = Date.now();
            result.then(mails => {mails.forEach(mail => {
                    sendMail(mail);
                    console.log("Mail sent");
                })
            }).catch(err => console.log(err));
        }
            
        setInterval( () => {
            let result = getMail(last_update);
            last_update = Date.now();
            result.then(mails => {mails.forEach(mail => {
                    sendMail(mail);
                    console.log("Mail sent");
                })
            }).catch(err => console.log(err));
        }, 3600000);
        
    }catch(e){
        
        console.log(e);
    }
}
async function getMail(deadline){
    try {
        // let content = fs.readFileSync('./Keys/credentials.json');
        let content = process.env.GMAIL_API;
        if(deadline === undefined)
        deadline = Date.now()
        let auth = await authorize(JSON.parse(content), listMessages, deadline).catch(err => {
            console.log(err);
            throw -2;
        })
        console.log("Getting mail");
        return await listMessages(auth, deadline);
        
    } catch (error) {
        console.log('Error loading client secret file:', error);  
      }
}