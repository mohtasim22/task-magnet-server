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

app.use(cors({
  
  origin: ['http://localhost:5173','http://localhost:5174','https://forumfocus-4db9e.web.app','https://forumfocus-4db9e.firebaseapp.com'],
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
    const forumCollection = client.db('forumDB').collection('posts');
    const commentsCollection = client.db('forumDB').collection('comments');
    const usersCollection = client.db('forumDB').collection('users');
    const announcementCollection = client.db('forumDB').collection('announcements');
    const tagsCollection = client.db('forumDB').collection('tags');

    // auth related api
    app.post('/jwt', async(req,res) =>{
      const user= req.body;
      console.log(user);
      const token =jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h'})
      res
      .cookie('token from server',token,{
        httpOnly: true,
        secure: false,
      })
      .send({success: true});
    })

    // forum posts
    app.get('/postss',async(req,res)=>{
      const sortbypop=req.query.sortbypop;
      const page= parseInt(req.query.page);
      const size= parseInt(req.query.size);

      if(sortbypop=='yes'){
        const cursor = forumCollection.aggregate([
          {
          $addFields: {
          voteDifference: { $subtract: [{ $toInt: "$upvote" },
          { $toInt: "$downvote" }] }
          }
          },
          {
          $sort: { voteDifference: -1 }
          }
          ])
          .skip(page*size)
          .limit(size);
          const result = await cursor.toArray();
          res.send(result);
      }else{
          const count = (await forumCollection.find().toArray()).length;
          const cursor = forumCollection.find()
          .skip(page*size)
          .limit(size);
          const result = await cursor.toArray();
          res.send({result,count});
      }   
    })
    app.get('/posts',async(req,res)=>{
      const cursor = forumCollection.aggregate([
        {
        $addFields: {
        voteDifference: { $subtract: [{ $toInt: "$upvote" },
        { $toInt: "$downvote" }] }
        }
        },
        {
        $sort: { voteDifference: -1 }
        }
        ])
        const result = await cursor.toArray();
        res.send(result);
    })
    app.get('/postss/:tag', async(req,res)=>{
      const tag = req.params.tag;
      console.log(tag);
      const query = {tag: tag};
      const cursor = forumCollection.find(query);
      const result = await cursor.toArray();
      res.send(result); 
    })
    app.post('/posts',async(req,res)=>{
      const newPost = req.body;
      console.log(newPost);
      const result = await forumCollection.insertOne(newPost);
      res.send(result);
    })
    app.get('/posts/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await forumCollection.findOne(query);
      res.send(result); 
    })
    app.delete('/posts/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await forumCollection.deleteOne(query);
      res.send(result); 
    })
    app.put('/posts/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true};
      const updatedPost= req.body;
      console.log(updatedPost)
      const post = {
          $set: {
              upvote:updatedPost.upvote,
              downvote:updatedPost.downvote,

          }
      }
      const result = await forumCollection.updateOne(filter, post, options);
      res.send(result); 
    })
    // forum comment
    app.get('/comments',async(req,res)=>{
      const cursor = commentsCollection.find();
      const result = await cursor.toArray();
      res.send(result);   
    })
    app.post('/comments',async(req,res)=>{
      const newComment = req.body;
      console.log(newComment);
      const result = await commentsCollection.insertOne(newComment);
      res.send(result);
    })
    app.get('/comments/:title', async(req,res)=>{
      const title = req.params.title;
      console.log(title);
      const query = {title: title};
      const cursor = commentsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result); 
    })

    // forum users
    app.get('/users',async(req,res)=>{
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);   
    })
    app.post('/users',async(req,res)=>{
      const newUser = req.body;
      console.log(newUser)
      const query={email: newUser.email}
      const existingUser= await usersCollection.findOne(query);
      if (existingUser){
        return res.send({message: 'user already exists',insertedId: null})
      }
      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    })
    app.put('/users/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true};
      const updatedPost= req.body;
      console.log(updatedPost)
      if ('badge' in updatedPost) {
        const post = {
          $set: {
              badge:updatedPost.badge,

          }
        }
        const result = await usersCollection.updateOne(filter, post, options);
        res.send(result); 
      }else{
        const post = {
          $set: {
              isAdmin:updatedPost.isAdmin,

          }
        }
        const result = await usersCollection.updateOne(filter, post, options);
        res.send(result); 
      }
           
    })
    // forum tags
    app.get('/tags',async(req,res)=>{
      const cursor = tagsCollection.find();
      const result = await cursor.toArray();
      res.send(result);   
    })
    app.post('/tags',async(req,res)=>{
      const newtag = req.body;
      console.log(newtag)
      const query={value: newtag.value}
      const existingTag= await tagsCollection.findOne(query);
      if (existingTag){
        return res.send({message: 'tag already exists',insertedId: null})
      }
      const result = await tagsCollection.insertOne(newtag);
      res.send(result);
    })


    // forum annoumcements
    app.get('/announcements',async(req,res)=>{
      const cursor = announcementCollection.find();
      const result = await cursor.toArray();
      res.send(result);   
    })
    app.post('/announcements',async(req,res)=>{
      const newAnnouncement = req.body;
      console.log(newAnnouncement);
      const result = await announcementCollection.insertOne(newAnnouncement);
      res.send(result);
    })
    app.delete('/announcements/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await announcementCollection.deleteOne(query);
      res.send(result); 
    })

    // payment api
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price*100);
    
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card'],
        
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });







    // assignments
    app.get('/assignments',async(req,res)=>{
        console.log(req.query);
        const page= parseInt(req.query.page);
        const size= parseInt(req.query.size);
        const difficulty= req.query.difficulty;
        console.log(difficulty);

        if(difficulty=='All'){
          const count = (await assignmentCollection.find().toArray()).length;
          const cursor = assignmentCollection.find()
          .skip(page*size)
          .limit(size);
          const result = await cursor.toArray();
          res.send({result,count});
        }else{
          const query = {difficulty: difficulty};
          const count = (await assignmentCollection.find(query).toArray()).length;
          const cursor = assignmentCollection.find(query)
          .skip(page*size)
          .limit(size);
          const result = await cursor.toArray();
          res.send({result,count});
        }
           
    })
    app.get('/assignmentsCount',async(req,res)=>{
        const count = assignmentCollection.estimatedDocumentCount()
        res.send({count});   
    })
    app.post('/assignments',async(req,res)=>{
      const newAssignment = req.body;
      console.log('User in the valid token',req.user);
      console.log(newAssignment);
      const result = await assignmentCollection.insertOne(newAssignment);
      res.send(result);
    })
    app.get('/assignments/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await assignmentCollection.findOne(query);
      res.send(result); 
    })
    app.put('/assignments/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true};
      const updatedAssignment= req.body;
      const assignment = {
          $set: {
              title:updatedAssignment.title,
              image:updatedAssignment.image,
              marks:updatedAssignment.marks,
              difficulty:updatedAssignment.difficulty,
              date:updatedAssignment.date,
              email:updatedAssignment.email,
              description:updatedAssignment.description

          }
      }
      const result = await assignmentCollection.updateOne(filter, assignment, options);
      res.send(result); 
    })
    app.delete('/assignments/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await assignmentCollection.deleteOne(query);
      res.send(result); 
    })

    // submittedAssignments
    app.get('/submittedAssignments', async(req,res)=>{
      const cursor = subAssignmentCollection.find();
      const result = await cursor.toArray();
      res.send(result);   
    })
    app.post('/submittedAssignments', async(req,res)=>{
      const newSubAssignment = req.body;
      console.log(newSubAssignment);
      const result = await subAssignmentCollection.insertOne(newSubAssignment);
      res.send(result);
    })
    app.patch('/submittedAssignments/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedSubAssignment= req.body;
      const updatedAssignment = {
          $set: {
            obtainedMarks:updatedSubAssignment.obtainedMarks,
            feedback:updatedSubAssignment.feedback,
            status:updatedSubAssignment.status,

          }
      }
      const result = await subAssignmentCollection.updateOne(filter, updatedAssignment);
      res.send(result); 
    })



    app.get('/product/:id', async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await productCollection.findOne(query);
        res.send(result); 
    })
    app.get('/products/:brand', async(req,res)=>{
        const brand = req.params.brand;
        console.log(brand);
        const query = {brand: brand};
        const cursor = productCollection.find(query);
        const result = await cursor.toArray();
        res.send(result); 
    })

    app.post('/product',async(req,res)=>{
        const newProduct = req.body;
        console.log(newProduct);
        const result = await productCollection.insertOne(newProduct);
        res.send(result);
    })
    app.put('/product/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true};
      const updatedProduct= req.body;
      const product = {
          $set: {
              name:updatedProduct.name,
              image:updatedProduct.image,
              brand:updatedProduct.brand,
              type:updatedProduct.type,
              price:updatedProduct.price,
              rating:updatedProduct.rating

          }
      }
      const result = await productCollection.updateOne(filter, product, options);
      res.send(result); 
  })
    ///myCart
    app.get('/myCartProducts',async(req,res)=>{
      const cursor = myCartProductsCollection.find();
      const result = await cursor.toArray();
      res.send(result);   
    })
    app.post('/myCartProducts',async(req,res)=>{
        const newProduct = req.body;
        console.log(newProduct);
        const result = await myCartProductsCollection.insertOne(newProduct);
        res.send(result);
    })
    app.delete('/myCartProducts/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await myCartProductsCollection.deleteOne(query);
      res.send(result); 
    })
    ///Brands
    app.get('/brands',async(req,res)=>{
      const cursor = brandCollection.find();
      const resultx = await cursor.toArray();
      res.send(resultx);   
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
    res.send('ForumFocus server is running')
})

app.listen(port, ()=>{
    console.log(`ForumFocus server is running on port: ${port}`)
})