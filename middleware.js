const jwt = require('jsonwebtoken');
const fetchUser = async(req,res,next) => {
    const token = req.header('usertoken');
    if(!token){
        res.status(401).send({error:"please authenticate usign valid tokens"})
        
    }else{
        try{
            const data = jwt.verify(token,process.env.secret_key)
            req.user = data.user;
            //console.log(data);
            next();
        }catch(error){
            res.status(401).send({errors:"please authenticate using valid token"})
        }
    }
}

module.exports = fetchUser;