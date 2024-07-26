const express = require('express')
const app = express()
const port = process.env.PORT || 5000;
const cors = require("cors");
require('dotenv').config();
const jwt = require("jsonwebtoken");

// 9h4ToygqlZYlVh5Z
// techRepair

app.use(cors());
app.use(express.json());
app.use(express.urlencoded());

// mongodb

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { default: axios } = require('axios');
const uri = "mongodb+srv://techRepair:9h4ToygqlZYlVh5Z@cluster1.ofi7kql.mongodb.net/?appName=Cluster1";

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
    // await client.connect();

    // database collection
    const servicesCollection = client.db("techRepair").collection("services");
    const serviceOrdersCollection = client.db("techRepair").collection("serviceOrders");
    const usersCollection = client.db("techRepair").collection("users");
    const productsCollection = client.db("techRepair").collection("products");
    const cartsCollection = client.db("techRepair").collection("carts");
    const reviewsCollection = client.db("techRepair").collection("reviews");
    const paymentsCollection = client.db("techRepair").collection("payments");

    // jwt api
    app.post("/jwt", async(req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "24h"});
        res.send({token})
    })

    // middlewares
    const verifyToken = (req, res, next) => {
        if(!req.headers.authorization){
            return res.status(403).send({message: "forbidden access"})
        }
        const token = req.headers.authorization.split(" ")[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if(err){
                return res.status(403).send({message: "forbidden access"})
            }
            req.decoded = decoded;
            next();
        })
    }

    const verifyAdmin = async(req, res, next) => {
        const email = req.decoded.email;
        const query = {email: email};
        const user = await usersCollection.findOne(query);
        const isAdmin = user?.role === "admin";
        if(!isAdmin){
            return res.status(403).send({message: "forbidden access"})
        }
        next();
    }

    app.post("/users", async(req, res) => {
        const user = req.body;
        const existingEmail = await usersCollection.findOne({email: user.email})
        if(existingEmail){
            return console.log("Already in usersCollection")
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
    })

    app.get("/users", verifyToken, verifyAdmin, async(req, res) => {
        const result = await usersCollection.find().toArray();
        res.send(result);
    })

    // check a user is an admin or not
    app.get("/users/admin/:email", verifyToken, async(req, res) => {
        const email = req.params.email;
        if(email !== req.decoded.email){
            return res.status(401).send({message: "Unauthorized Access"})
        }

        const query = {email: email}
        const user = await usersCollection.findOne(query);
        let admin = false;
        if(user){
            admin = user?.role === "admin"
        }

        res.send({admin});
    })

    // make user admin
    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async(req, res) => {
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
            $set: {
                role: "admin"
            }
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    // admin to user
    app.patch("/users/user/:id", verifyToken, verifyAdmin, async(req, res) => {
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
            $set: {
                role: "user"
            }
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    // block user
    app.patch("/users/blockUser/:id", verifyToken, verifyAdmin, async(req, res) => {
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
            $set: {
                status: "blocked"
            }
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    // active user
    app.patch("/users/activeUser/:id", verifyToken, verifyAdmin, async(req, res) => {
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
            $set: {
                status: "active"
            }
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    app.post("/service-orders", verifyToken, async(req, res) => {
        const orderDetails = req.body;
        const result = await serviceOrdersCollection.insertOne(orderDetails);
        res.send(result);
    })

    app.get("/allServices-bookings", verifyToken, verifyAdmin, async(req, res) => {
        const result = await serviceOrdersCollection.find().toArray();
        res.send(result);
    })

    // confirm service bookings
    app.patch("/allServices-bookings/confirmBooking/:id", verifyToken, verifyAdmin, async(req, res) => {
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
            $set: {
                status: "confirm"
            }
        };
        const result = await serviceOrdersCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    // cancel service bookings
    app.patch("/allServices-bookings/cancelBooking/:id", verifyToken, verifyAdmin, async(req, res) => {
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
            $set: {
                status: "canceled"
            }
        };
        const result = await serviceOrdersCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    // delivered service bookings
    app.patch("/allServices-bookings/deliveredBooking/:id", verifyToken, verifyAdmin, async(req, res) => {
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
            $set: {
                status: "delivered"
            }
        };
        const result = await serviceOrdersCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    // specific user
    app.get("/service-orders", verifyToken, async(req, res) => {
        const email = req.query.email;
        const query = {email: email}
        const result = await serviceOrdersCollection.find(query).toArray();
        res.send(result);
    })

    app.post("/services", verifyToken, verifyAdmin, async(req, res) => {
        const newService = req.body;
        const result = await servicesCollection.insertOne(newService);
        res.send(result);
    })

    app.get("/services", async(req, res) => {
        const result = await servicesCollection.find().toArray();
        res.send(result);
    })

    app.get("/services/:id", async(req, res) => {
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const result = await servicesCollection.findOne(filter);
        res.send(result);
    })

    app.patch("/services/:id", verifyToken, verifyAdmin, async(req, res) => {
        const updatedService = req.body;
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
            $set: {
                serviceName: updatedService.serviceName,
                serviceDescription: updatedService.serviceDescription,
                price: updatedService.price,
                imageURL: updatedService.imageURL,
                category: updatedService.category,
            }
        }
        const result = await servicesCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    app.delete("/services/:id", verifyToken, verifyAdmin, async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await servicesCollection.deleteOne(query);
        res.send(result);
    })

    app.post("/products", verifyToken, verifyAdmin, async(req, res) => {
        const newProduct = req.body;
        const result = await productsCollection.insertOne(newProduct);
        res.send(result);
    })

    app.get("/products", async(req, res) => {
        const result = await productsCollection.find().toArray();
        res.send(result);
    })

    app.get("/products/:id", async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await productsCollection.findOne(query);
        res.send(result);
    })

    app.patch("/products/:id", verifyToken, verifyAdmin, async(req, res) => {
        const updatedProduct = req.body;
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
            $set: {
                gadgetName: updatedProduct.gadgetName,
                image: updatedProduct.image,
                category: updatedProduct.category,
                gadgetModel: updatedProduct.gadgetModel,
                price: updatedProduct.price,
                description: updatedProduct.description
            }
        }
        const result = await productsCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    app.delete("/products/:id", verifyToken, verifyAdmin, async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await productsCollection.deleteOne(query);
        res.send(result);
    })

    // all shop orders from cart for admin
    // app.get("/allShopOrders", verifyToken, verifyAdmin, async(req, res) => {
    //     const result = await cartsCollection.find().toArray();
    //     res.send(result);
    // })

    // app.delete("/allShopOrders/:id", verifyToken, verifyAdmin, async(req, res) => {
    //     const id = req.params.id;
    //     const query = {_id: new ObjectId(id)};
    //     const result = await cartsCollection.deleteOne(query);
    //     res.send(result);
    // })

    // carts collection
    app.post("/carts", async(req, res) => {
        const data = req.body;
        const result = await cartsCollection.insertOne(data);
        res.send(result);
    })

    app.get("/carts", async(req, res) => {
        const email = req.query.email;
        const query = {email: email}
        const result = await cartsCollection.find(query).toArray();
        res.send(result);
    })

    app.delete("/carts/:id", async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await cartsCollection.deleteOne(query);
        res.send(result);
    })

    // add review
    app.post("/reviews", verifyToken, async(req, res) => {
        const review = req.body;
        const result = await reviewsCollection.insertOne(review);
        res.send(result);
    })

    app.get("/reviews", async(req, res) => {
        const result = await reviewsCollection.find().toArray();
        res.send(result);
    })

    // get individual payment order
    app.get("/shop-orders/:email", verifyToken, async(req, res) => {
        const email = req.params.email;
        const result = await paymentsCollection.find({
            cus_email: email,
            status: "success",
        }).toArray();
        res.send(result);
    })

    app.get("/allSuccessShopOrders", verifyToken, verifyAdmin, async(req, res) => {
        const result = await paymentsCollection.find({
            status: "success",
        }).toArray();
        res.send(result);
    })

    // sslcommerz payment
    app.post("/create-payment", async(req, res) => {
        const customerPaymentInfo = req.body;

        console.log(customerPaymentInfo)

        const transactionId = new ObjectId().toString();

        const initiateData = {
store_id: "progr6684b86aed7fe",
store_passwd: "progr6684b86aed7fe@ssl",
total_amount: customerPaymentInfo.amount,
currency: "USD",
tran_id: transactionId,
success_url: "http://localhost:5000/success-payment",
fail_url: "http://localhost:5000/fail",
cancel_url: "http://localhost:5000/cancel",
cus_name: customerPaymentInfo.customerName,
cus_email: customerPaymentInfo.customerEmail,
cus_add1: customerPaymentInfo.customerAddress,
cus_add2: customerPaymentInfo.customerAddress,
cus_city: customerPaymentInfo.city,
cus_state: customerPaymentInfo.city,
cus_postcode: customerPaymentInfo.zipCode,
cus_country: customerPaymentInfo.country,
cus_phone: customerPaymentInfo.customerPhoneNumber,
cus_fax: customerPaymentInfo.customerPhoneNumber,
ship_name: customerPaymentInfo.customerName,
ship_add1 : customerPaymentInfo.customerAddress,
ship_add2: customerPaymentInfo.customerAddress,
ship_city: customerPaymentInfo.city,
ship_state: customerPaymentInfo.city,
ship_postcode: customerPaymentInfo.zipCode,
ship_country: customerPaymentInfo.country,
multi_card_name: "x",
value_a: "x",
value_b: "x",
value_c: "x",
value_d: "x",
shipping_method: "NO",
product_name: "Computer",
product_category: "Electronic",
product_profile: "general",
num_of_item: 5,
weight_of_items: 2.00,
logistic_pickup_id: "x",
logistic_delivery_type: "x"
        }

        const response = await axios({
            method: "POST",
            url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
            data: initiateData,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            }
        })

        const savedData = {
            tran_id: transactionId,
            cus_name: customerPaymentInfo.customerName,
            cus_email: customerPaymentInfo.customerEmail,
            cus_city: customerPaymentInfo.city,
            cus_country: customerPaymentInfo.country,
            cus_zipCode: customerPaymentInfo.zipCode,
            cus_phone: customerPaymentInfo.customerPhoneNumber,
            total_amount: customerPaymentInfo.amount,
            date: customerPaymentInfo.date,
            time: customerPaymentInfo.time,
            cartIds: customerPaymentInfo.cartIds,
            cus_ordered_products: customerPaymentInfo.productItemIds,
            cus_ordered_products_name: customerPaymentInfo.ordered_product_name,
            status: "pending"
        }

        const result = await paymentsCollection.insertOne(savedData);

        // delete each item from the cart
        const query = {_id: {
            $in: savedData.cartIds.map(id => new ObjectId(id))
        }}

        const deleteResult = await cartsCollection.deleteMany(query);

        if(result) {
            res.send({
                paymentURL: response.data.GatewayPageURL,
                deleteResult
            })
        }


    })

    app.post("/fail", async(req, res) => {
        res.redirect("http://localhost:5173/fail");
    })

    app.post("/cancel", async(req, res) => {
        res.redirect("http://localhost:5173/cancel");
    })

    app.post("/success-payment", async(req, res) => {
        const successData = req.body;
        console.log(successData)

        if(successData.status !== "VALID"){
            return console.log("Invalid payment");
        }

        // update in database
        const query = {
            tran_id: successData.tran_id
        }

        const updatedDoc = {
            $set: {
                status: "success",
                card_type: successData.card_type,
                card_issuer_country: successData.card_issuer_country,
            }
        }

        const result = await paymentsCollection.updateOne(query, updatedDoc);

        res.redirect("http://localhost:5173/success");
    })

    // stats for admin and users
    app.get("/admin-stats", async(req, res) => {
        const users = await usersCollection.estimatedDocumentCount();
        const services = await servicesCollection.estimatedDocumentCount();
        const products = await productsCollection.estimatedDocumentCount();
        const totalServicesBookings = await serviceOrdersCollection.estimatedDocumentCount();

        const payments = await paymentsCollection.find({status: "success"}).toArray();

        const totalRevenue = payments.reduce((total, payment) => total + payment.total_amount, 0);

        res.send({
            users,
            services,
            products,
            totalServicesBookings,
            totalRevenue,
        })
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


app.get('/', (req, res) => {
  res.send('Tech Repair Server')
})

app.listen(port, () => {
  console.log(`server running on ${port}`)
})