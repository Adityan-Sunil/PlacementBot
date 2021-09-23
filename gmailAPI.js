const fs = require('fs');
const {google} = require('googleapis');
const readline = require('readline');
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = './Keys/token.json';
const credentials = JSON.parse(process.env.GMAIL_API);
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function createClient (){
  const {client_secret, client_id, redirect_uris} = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);
  return oAuth2Client;
}

async function authorize(server) {
  const oAuth2Client = createClient();

  // Check if we have previously stored a token.
  // let token = await fs.readFile(TOKEN_PATH).catch(err =>{
  //   return getNewToken(oAuth2Client, callback)
  // })    // let token = process.env.GMAIL_TOKEN;
    // let token = fs.readFileSync(TOKEN_PATH);
    let result = await server.getToken().catch(err => console.log(err));
    if(result.rowCount === 0){
      console.log("Token not in DB");
      return -1;
    }
    let token = result.rows[0].token;
    if(token !== undefined){
      // console.log(token);
      oAuth2Client.setCredentials(JSON.parse(token));
      // return callback(oAuth2Client);
      return oAuth2Client;
    } else {
      console.log("Token error");
      return -1;
    }
  } 
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getUrl() {
  const oAuth2Client = createClient();

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  return {client: oAuth2Client, url:authUrl};
}

function genToken(code, callback, oAuth2Client, server){
  oAuth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    oAuth2Client.setCredentials(token);
    // Store the token to disk for later program executions
    // fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
    //   if (err) { 
    //     console.error(err);
    //     throw -1;
    //   }
    //   console.log('Token stored to', TOKEN_PATH);
    // });
    server.storeToken(JSON.stringify(token)).catch(err => console.log(err));
    return callback(oAuth2Client);
  });
}

async function accountAuth(){
    const auth = new google.auth.GoogleAuth({
      keyFilename:'Keys/discordbot-324613-53e25100201d.json',
      scopes:SCOPES,
      subject:'interagus.adityan@gmail.com'
    })
    const authClient = await auth.getClient();
    return authClient;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {Date} deadline Last Updated time  
*/
async function listMessages(auth, last_fetched){
  console.log("Listing messages");
  const gmail = google.gmail({version:'v1', auth});
  let mails = [];
  let list = await gmail.users.messages.list({
      userId:'me',
      maxResults: 5,
      q:'from:(vit.placement1@gmail.com) subject:(2022 batch) -{Re: , Congratulations}'
      // q:'from:(interagus.adityan@gmail.com)'
    }).catch(err => {
    if(err) return console.log("Error fetching mails: "+err)
  });
  const messages = list.data.messages;
  if(messages.length){
    for (let id = 0; id < messages.length; id++) {
      const message = messages[id];
      let res = await gmail.users.messages.get({
        userId:'me',
        id:message.id
      }).catch(err => {
        if(err) return console.log("error: "+err);
      })
      if(last_fetched !== undefined && message.id === last_fetched)
        break;
      const payload = res.data.payload;
      // console.log(payload);
      payload.parts.forEach( part => {
        if(part.mimeType !== "text/plain") return;
        let data = part.body.data;
        let str_data = Buffer.from(data, 'base64');
        let str_data1 = str_data.toString();
        let split_data = str_data1.split("\r\n");
        let filtered = split_data.filter(element =>{
          return element.length !== 0 && element !== '>';
        })
        let index_crit = filtered.indexOf("Eligibility Criteria");
        let index_ctc = filtered.findIndex(element =>{
          return element === "CTC" || element === "ctc" || element ==="Ctc";
        });
        let index_stip = filtered.findIndex(element => { return element.match(/\s*Stipend\s*/i)});
        let index_last = filtered.findIndex(element => {return element.match(/\s*Last date for Registration\s*/)});
        let table_obj = {
          "id":message.id,
          "Name": filtered[2],
          "Category": filtered[4],
          "DOV": filtered[6],
          "Branches": filtered.slice(8, index_crit).join(','),
          "CGPA":filtered.slice(index_crit + 1, index_ctc).join(','),
          "CTC": filtered.slice(index_ctc + 1, index_stip).join(','),
          "Stipend": filtered.slice(index_stip + 1, index_last).join(','),
          "Deadline": filtered[index_last + 1],
        };
        mails.push(table_obj);
        // mails.push(data);
      })
    }
  }
  return mails;
}
async function syncMail(auth, last_fetched){
  console.log("Listing messages");
  const gmail = google.gmail({version:'v1', auth});
  let mails = [];
  let today = new Date();
  let filter = "before:"+today.getFullYear()+"/"+(today.getMonth() + 1)+"/"+(today.getDate() + 2) +" after:"+today.getFullYear()+"/"+(today.getMonth() + 1)+"/"+(today.getDate() - 1)
  let q = 'from:(vit.placement1@gmail.com) subject:(2022 batch) -{Re: , Congratulations} ' + filter; 
  console.log(q);
  let list = await gmail.users.messages.list({
      userId:'me',
      maxResults: 50,
      q:q
      // q:'from:(interagus.adityan@gmail.com)'
    }).catch(err => {
    if(err) return console.log("Error fetching mails: "+err)
  });
  const messages = list.data.messages;
  if(messages.length){
    for (let id = 0; id < messages.length; id++) {
      const message = messages[id];
      if(last_fetched !== undefined && message.id === last_fetched)
        break;
      let res = await gmail.users.messages.get({
        userId:'me',
        id:message.id
      }).catch(err => {
        if(err) return console.log("error: "+err);
      })
      const payload = res.data.payload;
      // console.log(payload);
      payload.parts.forEach( part => {
        if(part.mimeType !== "text/plain") return;
        let data = part.body.data;
        let str_data = Buffer.from(data, 'base64');
        let str_data1 = str_data.toString();
        let split_data = str_data1.split("\r\n");
        let filtered = split_data.filter(element =>{
          return element.length !== 0 && element !== '>';
        })
        let index_crit = filtered.indexOf("Eligibility Criteria");
        let index_ctc = filtered.findIndex(element =>{
          return element === "CTC" || element === "ctc" || element ==="Ctc";
        });
        let index_stip = filtered.findIndex(element => { return element.match(/\s*Stipend\s*/i)});
        let index_last = filtered.findIndex(element => {return element.match(/\s*Last date for Registration\s*/)});
        var deadline = filtered[index_last + 1];
        let table_obj = {
          "id":message.id,
          "Name": filtered[2],
          "Category": filtered[4],
          "DOV": filtered[6],
          "Branches": filtered.slice(8, index_crit).join(','),
          "CGPA":filtered.slice(index_crit + 1, index_ctc).join(','),
          "CTC": filtered.slice(index_ctc + 1, index_stip).join(','),
          "Stipend": filtered.slice(index_stip + 1, index_last).join(','),
          "Deadline": deadline,
        };
        mails.push(table_obj);
        // mails.push(data);
      })
    }
  }
  return mails;
}
// try {
//   let content = fs.readFileSync('./Keys/credentials.json')
//   let result = authorize(JSON.parse(content), listMessages)
//   result.then(auth => {
//     let msgs = listMessages(auth);
//     msgs.then(data => {
//       console.log(data);
//     }).catch(err => {
//       console.log(err);
//     })
//   }).catch(err => {
//     console.log(err);
//   })
// } catch (error) {
//   console.log('Error loading client secret file:', error);  
// }
// fs.readFile('credentials.json', (err, content) => {
//   if (err) return console.log('Error loading client secret file:', err);
//   // Authorize a client with credentials, then call the Gmail API.
//   authorize(JSON.parse(content), listMessages);
// });
module.exports = {authorize, listMessages, syncMail, genToken, getUrl}