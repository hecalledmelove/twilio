require('dotenv').config();
const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const MongoClient = require('mongodb').MongoClient;

const app = express();
app.use(express.urlencoded({ extended: false }));

// Database connection
const dbClient = new MongoClient(process.env.DB_URI);
let db;

async function connectDB() {
  await dbClient.connect();
  db = dbClient.db(process.env.DB_NAME);
  console.log("Connected to database");
}

// WhatsApp webhook
app.post('/whatsapp', async (req, res) => {
  const incomingMsg = req.body.Body.toLowerCase();
  const sender = req.body.From;

  try {
    let response;
    
    if (incomingMsg.includes('find')) {
      // Query database
      const results = await db.collection('items')
        .find({ $text: { $search: incomingMsg.replace('find', '') } })
        .toArray();
      response = results.map(r => r.name).join(', ') || 'No results found';
    } else if (incomingMsg.includes('add')) {
      // Insert into database
      await db.collection('items').insertOne({
        name: incomingMsg.replace('add', '').trim(),
        createdAt: new Date()
      });
      response = 'Item added successfully!';
    } else {
      response = 'Welcome! Send "find [item]" to search or "add [item]" to add.';
    }

    const twiml = new MessagingResponse();
    twiml.message(response);
    res.type('text/xml').send(twiml.toString());
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing request');
  }
});

// Start server after DB connection
connectDB().then(() => {
  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
});
