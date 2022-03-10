const express = require("express");
const { MongoClient } = require("mongodb");
const SSLCommerzPayment = require("sslcommerz");
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    const brands = database.collection("Brands");
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

    //<------------ Get All Brands ------------->

    app.get("/brands", async (req, res) => {
      const allBrands = await brands.find({}).toArray();
      res.send(allBrands);
    });

    //<------------ Get Team Data From Database ------------->

    app.get("/about", async (req, res) => {
      const ourTeams = await teams.find({}).toArray();
      res.send(ourTeams);
    });

    // Initialize Payment

    app.post("/init", async (req, res) => {
      const productInfo = {
        total_amount: req.body.total_amount,
        currency: "BDT",
        tran_id: uuidv4(),
        success_url: "http://localhost:5000/success",
        fail_url: "http://localhost:5000/failure",
        cancel_url: "http://localhost:5000/cancel",
        ipn_url: "http://localhost:5000/ipn",
        paymentStatus: "pending",
        shipping_method: "Courier",
        product_name: req.body.product_name,
        product_category: "Electronic",
        product_profile: req.body.product_profile,
        product_image: req.body.product_image,
        cus_name: req.body.cus_name,
        cus_email: req.body.cus_email,
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: req.body.cus_name,
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
        multi_card_name: "mastercard",
        value_a: "ref001_A",
        value_b: "ref002_B",
        value_c: "ref003_C",
        value_d: "ref004_D",
      };

      // Insert order info
      const result = await OrderCollections.insertOne(productInfo);

      const sslcommer = new SSLCommerzPayment(
        process.env.STORE_ID,
        process.env.STORE_PASSWORD,
        false
      );
      sslcommer.init(productInfo).then((data) => {
        const info = { ...productInfo, ...data };
        if (info.GatewayPageURL) {
          res.json(info.GatewayPageURL);
        } else {
          return res.status(400).json({
            message: "SSL session was not successful",
          });
        }
      });
    });
    app.post("/success", async (req, res) => {
      const order = await OrderCollections.updateOne(
        { tran_id: req.body.tran_id },
        {
          $set: {
            val_id: req.body.val_id,
          },
        }
      );
      res.redirect(`http://localhost:3000/success/${req.body.tran_id}`);
    });
    app.post("/failure", async (req, res) => {
      const order = await OrderCollections.deleteOne({
        tran_id: req.body.tran_id,
      });
      res.redirect(`http://localhost:3000/fail`);
    });
    app.post("/cancel", async (req, res) => {
      const order = await OrderCollections.deleteOne({
        tran_id: req.body.tran_id,
      });
      res.redirect(`http://localhost:3000/cancel`);
    });
    app.post("/ipn", (req, res) => {
      console.log(req.body);
      res.send(req.body);
    });

    app.get("/orders/:tran_id", async (req, res) => {
      const id = req.params.tran_id;
      const order = await OrderCollections.findOne({ tran_id: id });
      console.log(order);
      res.json(order);
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
