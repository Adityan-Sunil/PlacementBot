const db = require('pg'); 
class DBConn{
    client = new db.Client({
        connectionString: process.env.DB_URL,
        ssl:{rejectUnauthorized: false}
    });
        
    isConnected = false;
    async connect(){
        await this.client.connect();
        console.log("DB Connected")
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
        let time = new Date();
        console.log(time);
        let result = await this.client.query("SELECT * from companies where deadline > CURRENT_TIMESTAMP");
        return result;
    }
    time(deadline){
        console.log("1. "+deadline);
        console.log(typeof deadline);
        try{
            deadline = deadline.replace('  ',' ');
            deadline = deadline.replace('( ', '(');
            deadline = deadline.replace(' )', ')');
            var date_dead = deadline.split(' ');
            console.log(date_dead);
            if(date_dead.length < 5){
                date_dead[0] = date_dead[0].replace(/th|rd|st|nd/i,' ')
                date_dead = date_dead.join(' ').split(' ');
                date_dead[1] = date_dead[1].trim();
                deadline = date_dead.join(' ');
            }
            date_dead = date_dead.slice(0,3);
            date_dead[0] = parseInt(date_dead[0]).toString();
            let time_dead = deadline.split(' ').slice(3);
            var t = time_dead[0].replace('(','');
            if(time_dead[1] === "pm)"){
            let flt = parseFloat(t);
            console.log(flt);
            if(flt !== 12)
                t = parseFloat((flt + 12)%24).toString();
            else t = flt.toString();
            } else t = t.replace('(','');
            t = t.replace('.',':');
            t = t+":00"
            let _deadline = date_dead.join(' ')+" "+ t + " +530";
            console.log(_deadline);
            return _deadline;
        }
        catch(err){
            console.log("Error "+deadline);
            console.log(err);
        }
    }
    async storeCompany(company){
        console.log(company);
        var deadline
        if(typeof company.Deadline === 'string'){
            deadline = Date.parse(this.time(company.Deadline))
            console.log(deadline);
        }
        if(!this.isConnected) throw "Failed to execute INSERT query to company";
        let result = this.client.query("INSERT INTO companies (ID, NAME, CATEGORY, DOV, BRANCHES, CGPA, CTC, STIPEND, DEADLINE) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9))",[company.id, company.Name, company.Category,company.DOV, company.Branches, company.CGPA, company.CTC, company.Stipend, deadline/1000]);
        return result;
    }

    async deleteExpired(){
        if(!this.isConnected) throw "DB not Connected";
        let result = this.client.query("DELETE FROM COMPANIES WHERE DEADLINE < CURRENT_TIMESTAMP")
        return result;
    }
    async getRecent(){
        if(!this.isConnected) throw "DB not Connected";
        let result = await this.client.query('select id from companies order by id desc limit 1;').catch(err => console.log(err));
        return result;
    }
    async getToken(){
        if(!this.isConnected) throw "DB not Connected";
        let result = await this.client.query('select token from tokens order by id desc limit 1;').catch(err => console.log(err));
        return result;
    }
    async storeToken(token){
        if(!this.isConnected) throw "DB not Connected";
        await this.client.query("DELETE FROM TOKENS").catch(err => console.log(err));
        await this.client.query("INSERT INTO TOKENS (TOKEN) VALUES ($1)", [token]).catch(err => console.log(err));
        return 0;
    }

}
module.exports = DBConn;