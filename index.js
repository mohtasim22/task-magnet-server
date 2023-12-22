const express = require('express');
require('dotenv').config()
const cors = require('cors');
const jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser')
const app = express();
const port = process.env.PORT || 5000;
const stripe = require("stripe")('sk_test_51OHXguD6YcGJ9kTnv6llOtIU0P26t8WMWtVS7nT4H6KokEpFiL9lzxOAFALOETffOpaAIdnXsZlzjwywvzYo9Z3f00or6va4o1');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//middleware
// const corsConfig = {
//   origin: '*',
//   credentials: true,
//   optionSucessStatus:200,
//   methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH','OPTIONS']
// }
// app.use(cors())
// app.options("", cors(corsConfig))
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', 'https://taskmagnet-64d54.web.app');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
//   res.header('Access-Control-Allow-Headers', 'Content-Type');
//   next();
// });
app.use(cors({
  
  origin: ['http://localhost:5173','http://localhost:5174','https://taskmagnet-64d54.web.app'],
  credentials: true,
  optionSucessStatus:200,
  methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH','OPTIONS']
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xe6z2zy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect ()
    const tasksCollection = client.db('tasksDB').collection('tasks');

    // task related api
    app.get('/tasks',async(req,res)=>{
      const cursor = tasksCollection.find();
      const result = await cursor.toArray();
      res.send(result);   
    })
    app.post('/tasks',async(req,res)=>{
      const newTask = req.body;
      console.log(newTask);
      const result = await tasksCollection.insertOne(newTask);
      res.send(result);
    })
    app.get('/taskss/:email', async(req,res)=>{
      const email = req.params.email;
      console.log(email);
      const query = {email: email};
      const cursor = tasksCollection.find(query);
      const result = await cursor.toArray();
      res.send(result); 
    })
    app.delete('/tasks/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await tasksCollection.deleteOne(query);
      res.send(result); 
    })
    app.put('/tasks/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true};
      const updatedAssignment= req.body;
      const assignment = {
          $set: {
              status:updatedAssignment.status,

          }
      }
      const result = await tasksCollection.updateOne(filter, assignment, options);
      res.send(result); 
    })


    

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req,res) =>{
    res.send('TaskMagnet server is running')
})

app.listen(port, ()=>{
    console.log(`TaskMagnet server is running on port: ${port}`)
})