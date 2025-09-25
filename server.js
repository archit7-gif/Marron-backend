require("dotenv").config()
const PORT = process.env.PORT || 3000 
const app = require("./src/app")
const ConnectDB = require("./src/db/db")
const initSocketServer = require("./src/sockets/socket.server")
const httpServer = require('http').createServer(app)

ConnectDB()
initSocketServer(httpServer)



httpServer.listen(PORT,()=>{
console.log(`server is running on PORT ${PORT}`)})