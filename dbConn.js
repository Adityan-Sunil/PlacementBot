const db = require('pg'); 
class DBConn{
    client = new db.Client({
        connectionString: process.env.DB_URL,
        ssl:{rejectUnauthorized: false}
    });
        
    isConnected = false;
    async connect(){
        await this.client.connect();
        this.isConnected = true;
    }
    async storeData(userData){
        const {name, regno, cgpa} = userData;
        console.log(name, regno, cgpa)
        if(!this.isConnected) throw -1
        let result = this.client.query('INSERT INTO bot_users (name, regno, cgpa) VALUES ($1,$2,$3)',[name, regno, cgpa])
        return result;
    }

    async getData(){
        if(!this.isConnected) throw -1;
        let result = await this.client.query('SELECT * FROM bot_users')
        return result;
    }

}
module.exports = DBConn;