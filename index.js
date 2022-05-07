import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
  db = mongoClient.db("user");
});

const app = express();
app.use(express.json());

app.post("/sign-up", async (req, res) => {
  //name, email, password
  //validar senha e confirmacao de senha no front
  const user = req.body;
  const passwordHash = bcrypt.hashSync(user.password, 10);

  // Insira o usuário no banco, criptografando a senha com bcrypt
  try {
    await db.collection("users").insertOne({...user, password: passwordHash});
    res.sendStatus(201);
  } catch(e) {
    res.sendStatus(500);
  }

});


const port = process.env.PORTA || 5000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}.`);
});