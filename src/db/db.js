

const mongoose  = require('mongoose')



async function ConnectDB(){
    try {
    await mongoose.connect(process.env.MONGODB_URL)
    console.log("Connected to DB")
    } catch (err) {
    console.log("Failed To Connect DB", err)
    }

}


module.exports = ConnectDB