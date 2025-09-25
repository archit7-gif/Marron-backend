

const { Server } = require("socket.io")
const cookie = require('cookie')
const jwt = require('jsonwebtoken')
const userModel = require('../models/user.model')
const aiService = require("../services/ai.service")
const messageModel = require("../models/message.model")
const { createMemory, queryMemory } = require("../services/vector.service")





// 🔌 Socket server initialization function
const initSocketServer = (httpServer) => {


const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"]
  }
});



io.use(async (socket, next) => {


const cookies = cookie.parse(socket.handshake.headers?.cookie || "")


if (!cookies.token) {
return next(new Error("Authentication error, No Token Provided"))}

try {

const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET)


const user = await userModel.findById(decoded.id).select("-password")

if (!user) {
return next(new Error("Authentication error, User not found"))}


socket.user = user
next()
} catch (error) {

next(new Error("Authentication error"))}})





io.on("connection", (socket) => {


socket.on("ai-message", async (messagePayload) => {
let LTM = []   // Long-term memory store
let STM        // Short-term memory store
let message    // User ka original message (MongoDB entry)
let vectors    // User message ka vector (embedding)

try {


[message, vectors] = await Promise.all([
messageModel.create({
chat: messagePayload.chat,
user: socket.user._id,
content: messagePayload.content,
role: "user"}),
aiService.generateVector(messagePayload.content)])



await createMemory({
vectors,
messageID: message._id,
metadata: {
chat: messagePayload.chat,
user: socket.user._id,
text: messagePayload.content}})



const [memory, chatHistory] = await Promise.all([
queryMemory({
queryVector: vectors,
limit: 3,
metadata: { user: socket.user._id }}),
messageModel.find({ chat: messagePayload.chat })
.sort({ createdAt: -1 }).limit(3).lean().then(docs => docs.reverse())]) // latest → oldest order me convert





// 7️⃣ Short-term memory prepare (recent chat context)
STM = chatHistory.length > 0
? chatHistory.map(item => ({
role: item.role,
parts: [{ text: item.content }]}))
: [{ role: "user", parts: [{ text: messagePayload.content }] }]



// 8️⃣ Long-term memory prepare (Pinecone se purane context)
LTM = [{
role: "user",
parts: [{
text: `These are some previous chat messages, use them for context:\n${memory.map(item => item.metadata.text).join('\n')}`}]}]

} catch (err) {
console.error("❌ Error while saving message or vector:", err)

// ⚠️ Rollback: agar DB me message save ho gaya but vector fail ho gaya → delete it
if (message?._id && !vectors) {
await messageModel.deleteOne({ _id: message._id })
console.warn(`Rolled back unsynced message ${message._id}`)}

// 🛟 Fallback: agar kuch bhi fail ho jaye → at least STM me user ka message rahe
LTM = []
STM = [{ role: "user", parts: [{ text: messagePayload.content }] }]}



const response = await aiService.generateResponse([...LTM, ...STM])
console.log("🤖 AI Response:", response)



socket.emit("ai-response", {
content: response,
chat: messagePayload.chat })



const responseMessage = await messageModel.create({
chat: messagePayload.chat,
user: socket.user._id,
content: response,
role: "model" })


const responseVectors = await aiService.generateVector(response)

await createMemory({
vectors: responseVectors,
messageID: responseMessage._id,
metadata: {
chat: messagePayload.chat,
user: socket.user._id,
text: response }

}) }) })
}



module.exports = initSocketServer
