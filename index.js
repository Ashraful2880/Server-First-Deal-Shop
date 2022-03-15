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

    //<------------ Get All Products by Category ------------->

    app.get("/findProducts", async (req, res) => {
      const search = req.query.category;
      const products = await Products.find({}).toArray();
      const findProducts = products?.filter((value) =>
        value?.category?.includes(search)
      );
      res.send(findProducts);
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
        currency: "BDT",
        paymentStatus: "pending",
        tran_id: uuidv4(),
        success_url: "https://safe-bastion-76919.herokuapp.com/success",
        fail_url: "https://safe-bastion-76919.herokuapp.com/failure",
        cancel_url: "https://safe-bastion-76919.herokuapp.com/cancel",
        ipn_url: "https://safe-bastion-76919.herokuapp.com/ipn",
        product_name: req.body.product_name,
        product_category: "test",
        product_profile: req.body.product_profile,
        product_image: req.body.product_image,
        productDetails: req.body.productDetails,
        total_amount: req.body.total_amount,
        cus_name: req.body.cus_name,
        cus_email: req.body.cus_email,
        cus_add1: req.body.cus_add1,
        cus_street: req.body.cus_street,
        cus_city: req.body.city,
        cus_state: req.body.cus_state,
        cus_postcode: req.body.cus_postcode,
        cus_country: req.body.cus_country,
        cus_phone: req.body.cus_phone,
        shipping_method: "Courier",
        ship_name: req.body.cus_name,
        ship_add1: req.body.cus_add1,
        ship_add2: req.body.cus_add1,
        ship_city: req.body.cus_city,
        ship_state: req.body.cus_state,
        ship_postcode: req.body.cus_postcode,
        ship_country: req.body.cus_country,
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

    //<----------- Success, Fail, Cancel And APN API Here ---------->

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
      res.redirect(`http://localhost:3000/placeOrder`);
    });

    app.post("/cancel", async (req, res) => {
      const order = await OrderCollections.deleteOne({
        tran_id: req.body.tran_id,
      });
      res.redirect(`http://localhost:3000/`);
    });
    app.post("/ipn", (req, res) => {
      res.send(req.body);
    });
    //<---------- Ger Payment Complete Details -------->
    app.get("/orders/:tran_id", async (req, res) => {
      const id = req.params.tran_id;
      const order = await OrderCollections.findOne({ tran_id: id });
      res.json(order);
    });

    //<---------- Validate Transaction By User clicking Success Button -------->
    app.post("/validate", async (req, res) => {
      const order = await OrderCollections.findOne({
        tran_id: req.body.tran_id,
      });
      if (order.val_id === req.body.val_id) {
        const update = await OrderCollections.updateOne(
          { tran_id: req.body.tran_id },
          {
            $set: { paymentStatus: "Successful" },
          }
        );
        res.send(update.modifiedCount > 0);
      } else {
        res.send("Payment Not Confirmed, Discarted Order");
      }
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
