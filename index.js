import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import cors from 'cors'

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
  db = mongoClient.db("user");
});

const app = express();
app.use(express.json());
app.use(cors())

app.post("/sign-up", async (req, res) => {
  const user = req.body;
  const passwordHash = bcrypt.hashSync(user.password, 10);

  try {
    await db.collection("users").insertOne({ ...user, password: passwordHash, extract: [] });
    res.sendStatus(201);
  } catch (e) {
    res.sendStatus(500);
  }

});

app.post("/sign-in", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.collection("users").findOne({ email });
    if (user && bcrypt.compareSync(password, user.password)) {
      res.send(user);
    } else {
      res.sendStatus(401);
    }
  } catch (e) {
    res.sendStatus(500);
  }

});

app.get("/extrato", async (req, res) => {
  let {authorization} = req.headers;
  const passwordToken = authorization.slice(7);
  try {

    const user = await db.collection("users").findOne({ password:passwordToken });
    if (user.password === passwordToken) {
      res.send(user.extract);
    } else {
      res.sendStatus(401);
    }
  } catch (e) {
    res.sendStatus(500);
  }

});


const port = process.env.PORTA || 5000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}.`);
});