


const express = require('express');
const { authUser } = require('../middlewares/auth.middleware');
const { createChat, getChats, getChatMessages, getChat, deleteChat, updateChatTitle } = require('../controllers/chat.controller');

const router = express.Router();

router.post('/', authUser, createChat);
router.get('/', authUser, getChats);
router.get('/:chatId', authUser, getChat);
router.get('/:chatId/messages', authUser, getChatMessages);
router.delete('/:chatId', authUser, deleteChat);
router.put('/:chatId/title', authUser, updateChatTitle); // Add this line

module.exports = router;

