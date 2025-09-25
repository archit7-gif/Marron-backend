

const chatModel = require('../models/chat.mode'); // Fixed typo
const messageModel = require('../models/message.model');
const { deleteMessageVectors } = require('../services/vector.service'); // Add import

const createChat = async (req, res) => {
  const { title } = req.body;
  const user = req.user;

  const chat = await chatModel.create({ user: user._id, title });

  res.status(201).json({
    message: "Chat Created Successfully",
    chat: {
      _id: chat._id,
      title: chat.title,
      lastActivity: chat.lastActivity,
      user: chat.user
    }
  });
};

const getChats = async (req, res) => {
  const user = req.user;
  const chats = await chatModel.find({ user: user._id }).sort({ updatedAt: -1 });
  res.json({ chats });
};

const getChat = async (req, res) => {
  const { chatId } = req.params;
  const chat = await chatModel.findById(chatId);
  if (!chat) return res.status(404).json({ message: 'Chat not found' });
  res.json({ chat });
};

const getChatMessages = async (req, res) => {
  const { chatId } = req.params;
  const messages = await messageModel.find({ chat: chatId }).sort({ createdAt: 1 });
  res.json({ messages });
};

// REPLACE YOUR DELETE FUNCTION WITH THIS:
const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const user = req.user;

    // Find the chat and verify ownership
    const chat = await chatModel.findOne({ _id: chatId, user: user._id });
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    console.log(`🗑️ Deleting chat ${chatId}...`);

    // Get all message IDs from MongoDB
    const messages = await messageModel.find({ chat: chatId }).select('_id');
    const messageIds = messages.map(msg => msg._id);
    
    console.log(`📝 Found ${messageIds.length} messages to delete`);

    // Delete from Pinecone first
    if (messageIds.length > 0) {
      await deleteMessageVectors(messageIds);
      console.log(`✅ Deleted ${messageIds.length} vectors from Pinecone`);
    }

    // Delete from MongoDB
    await messageModel.deleteMany({ chat: chatId });
    await chatModel.findByIdAndDelete(chatId);
    console.log(`✅ Deleted chat and messages from MongoDB`);

    res.json({ 
      message: 'Chat deleted successfully',
      deleted: {
        messages: messageIds.length,
        chatId: chatId
      }
    });

  } catch (error) {
    console.error('❌ Delete chat error:', error);
    res.status(500).json({ 
      message: 'Failed to delete chat', 
      error: error.message 
    });
  }
};

const updateChatTitle = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { title } = req.body;
    const user = req.user;

    // Find the chat and verify ownership
    const chat = await chatModel.findOne({ _id: chatId, user: user._id });
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Update the chat title
    const updatedChat = await chatModel.findByIdAndUpdate(
      chatId,
      { title, lastActivity: new Date() },
      { new: true }
    );

    res.json({
      message: 'Chat title updated successfully',
      chat: updatedChat
    });
  } catch (error) {
    console.error('Update chat title error:', error);
    res.status(500).json({ message: 'Failed to update chat title' });
  }
};

module.exports = { createChat, getChats, getChat, getChatMessages, deleteChat, updateChatTitle };

