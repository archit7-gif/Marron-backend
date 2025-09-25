

// Import the Pinecone library
const { Pinecone } = require('@pinecone-database/pinecone')

// Initialize a Pinecone client with your API key
const pc = new Pinecone({ apiKey: process.env.PINECONEAPI });

const cohortChatGptIndex = pc.index('cohort-chat-gpt')

async function createMemory({ vectors, metadata, messageID }) {
    await cohortChatGptIndex.upsert([
        {
        id: messageID,
        values: vectors,   // must be an array of numbers
        metadata
        }
    ])
}

async function queryMemory({ queryVector, limit = 5, metadata }) {
    const data = await cohortChatGptIndex.query({
        vector: queryVector,
        topK: limit,
        filter: metadata || undefined,   // ✅ fix filter format
        includeMetadata: true
    })

    return data.matches
}

async function deleteMemory(messageID) {
    try {
        await cohortChatGptIndex.deleteOne(messageID.toString());
        console.log(`✅ Deleted vector for message ${messageID} from Pinecone`);
    } catch (err) {
        console.error(`❌ Error deleting vector ${messageID} from Pinecone:`, err);
    }
}

// FIXED: Use proper Pinecone deletion method
async function deleteMessageVectors(messageIds) {
    try {
        if (!messageIds || messageIds.length === 0) return;
        
        const stringIds = messageIds.map(id => id.toString());
        
        // Method 1: Try batch delete
        try {
            await cohortChatGptIndex.deleteMany(stringIds);
            console.log(`✅ Batch deleted ${stringIds.length} vectors from Pinecone`);
            return;
        } catch (batchError) {
            console.log(`⚠️ Batch delete failed, trying individual delete...`);
        }
        
        // Method 2: Individual delete (fallback)
        let deleted = 0;
        for (const id of stringIds) {
            try {
                await cohortChatGptIndex.deleteOne(id);
                deleted++;
            } catch (err) {
                console.error(`❌ Failed to delete vector ${id}:`, err.message);
            }
        }
        
        console.log(`✅ Individually deleted ${deleted}/${stringIds.length} vectors from Pinecone`);
        
    } catch (err) {
        console.error(`❌ Error deleting vectors from Pinecone:`, err);
        throw err;
    }
}

module.exports = { createMemory, queryMemory, deleteMemory, deleteMessageVectors };


