const db = require('./dbConn.js')
const server = new db();
init();
async function init(){
    await server.connect();
    let res = await server.getList();
    console.log(res.rows);
}