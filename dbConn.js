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

    async getList(){
        if(!this.isConnected) throw -1;
        let time = Date.now();
        let result = await this.client.query('SELECT * from companies where deadline < to_timestamp($1)', [time/1000]);
        return result;
    }

    async storeCompany(company){
        console.log(company);
        if(!this.isConnected) throw "Failed to execute INSERT query to company";
        let result = this.client.query("INSERT INTO companies (ID, NAME, CATEGORY, DOV, BRANCHES, CGPA, CTC, STIPEND, DEADLINE) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9))",[company.id, company.Name, company.Category,company.DOV, company.Branches, company.CGPA, company.CTC, company.Stipend, company.Deadline/1000]);
        return result;
    }

    async deleteExpired(){
        if(!this.isConnected) throw "DB not Connected";
        let time = Date.now();
        let result = this.client.query("DELETE FROM COMPANIES WHERE DEADLINE < to_timestamp($1", [time], (err, res) =>{
            if(err) console.log(err);
        })
    }
}
module.exports = DBConn;