const express = require("express");
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");

app.use(cors());
app.use(express.json());

//<------------- Database Code Here ---------->

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pxp8q.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();

    //<------------ Database All Collections ------------->
    const database = client.db("Awesome_Store");
    const Products = database.collection("Products");
    const OrderCollections = database.collection("Orders");
    const blogs = database.collection("Blogs");
    const teams = database.collection("Teams");

    //<------------ Get All Products ------------->

    app.get("/Products", async (req, res) => {
      const FindProducts = await Products.find({}).toArray();
      res.send(FindProducts);
    });

    //<--------- Get Top trending Products ---------->

    app.get("/topTrending", async (req, res) => {
      const trending = req.query;
      const result = await Products.find({
        slug: trending.topTrending,
      }).toArray();
      res.send(result);
    });
    //<--------- Get Best Selling Products ---------->

    app.get("/bestSelling", async (req, res) => {
      const trending = req.query;
      const result = await Products.find({
        slug: trending.bestSelling,
      }).toArray();
      res.send(result);
    });

    //<------------ Find Products Information For Cart ------------->

    app.get("/addToCart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const showOrder = await Products.findOne(query);
      res.json(showOrder);
    });

    //<------------ Get All Blogs ------------->

    app.get("/blogs", async (req, res) => {
      const AllBlogs = await blogs.find({}).toArray();
      res.send(AllBlogs);
    });

    //<------------ Get Team Data From Database ------------->

    app.get("/about", async (req, res) => {
      const ourTeams = await teams.find({}).toArray();
      res.send(ourTeams);
    });

    //<------------ Get Payment From User And Send to DB ------------->

    app.post("/pay", async (req, res) => {
      const receiveOrder = req.body;
      const result = await OrderCollections.insertOne(receiveOrder);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Running Awesome Store");
});

app.listen(port, () => {
  console.log("Running Server Port is", port);
});
