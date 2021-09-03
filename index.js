//Discord libs
const { Client, Intents, MessageEmbed} = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
require('dotenv').config();
const {token, general, placement, me} = JSON.parse(process.env.DISCORD_CONFIG);
// const {token, general, placement, me} = require('./Keys/config.json');
var bot_ready = false;
const db = require('./dbConn');
const { authorize, listMessages } = require('./gmailAPI');
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
})
function sendMail(mail = undefined){
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
    console.log(_mail);
    const embed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle(_mail.Name)
                    .setDescription(_mail.Category)
                    .addFields(
                        {name:"DOV", value:_mail.DOV},
                        {name:"CGPA", value:_mail.CGPA.join('\n')},
                        {name:"Branches", value:_mail.Branches.join('\n')},
                        {name:"Stipend", value:_mail.Stipend.join('\n')},
                        {name:"CTC", value:_mail.CTC.join('\n')},
                        {name:"Deadline", value:_mail.Deadline},
                    )
    return embed;
}
init();
function init(){
    console.log("started");
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