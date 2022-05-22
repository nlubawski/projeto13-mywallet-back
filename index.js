import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import cors from 'cors'
import joi from "joi";
import { v4 as uuid } from 'uuid';
import dayjs from "dayjs"

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
  db = mongoClient.db("MYWALLET");
  console.log("mongo conectado")
});

const app = express();
app.use(express.json());
app.use(cors())

app.post("/sign-up", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  const cadastrarSchema = joi.object({
    name: joi.string().required(),
    email: joi.string().email().required(),
    password: joi.string().required(),
    confirmPassword: joi.ref('password')
  })
  try {
    await cadastrarSchema.validateAsync({
      name,
      email,
      password,
      confirmPassword
    }, { abortEarly: false });
    console.log("validou1")
  } catch (error) {
    res.status(422).send("Erro ao preencher cadastro");
  }
  try {
    const cliente = await db.collection("users").findOne({ email })
    if (cliente) {
      console.log("Email já cadastrado")
      res.sendStatus(400);
      return;
    }
  } catch (error) {
    console.log("Erro ", error)
  }
  try {
    const SALT = 10;
    const passwordHash = bcrypt.hashSync(password, SALT);
    await db.collection("users").insertOne({
      name,
      email,
      password: passwordHash
    });
    return res.sendStatus(201);
  } catch (error) {
    console.log("Erro ao criar cliente");
    console.log(error);
    return res.sendStatus(500);
  }
});

app.post("/sign-in", async (req, res) => {
  const { email, password } = req.body;
  const loginSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required()
  })
  try {
    await loginSchema.validateAsync(
      {
        email,
        password
      }, { abortEarly: false });
  } catch (error) {
    res.status(422).send("deu erro");
  }
  try {
    const cliente = await db.collection("users").findOne({ email: email })
    console.log("ate aqui")
    if (!cliente) return res.sendStatus(404);
    console.log("hoje nao")
    if (cliente && bcrypt.compareSync(password, cliente.password)) {
      const token = uuid();
      await db.collection("sessions").insertOne({ token, clienteId: cliente._id });
      const data = {
        token,
        name: cliente.name,
        clienteId: cliente._id
      }
      return res.send(data);
    }
    return res.sendStatus(201);
  }
  catch (error) {
    console.log("Erro, cliente nao encontrado");
    console.log(error);
    return res.sendStatus(500);
  }
})

app.get("/extrato", async (req, res) => {
  const { authorization } = req.headers;
  const token = authorization?.replace("Bearer", "").trim();

  if (!token) return res.status(401).send("Sem token.");
  try {
    const session = await db.collection("sessions").findOne({ token });
    if (!session) return res.status(401).send("Sem sessao");

    const cliente = await db.collection("users").findOne({ _id: session.clienteId });
    if (!cliente) return res.status(401).send("Sem usuario");

    const extrato = await db.collection("extrato").find({clienteId: cliente._id}).toArray();
    console.log("extrato", extrato)
    res.send(extrato);

  } catch (error) {
    console.log("Erro ao tentar obter extrato");
    console.log(error);
    return res.sendStatus(500);
  } 
});

app.post("/extrato", async (req, res) => {

  const { authorization } = req.headers;
  const token = authorization?.replace("Bearer", "").trim();

  const transactionSchema = joi.object({
    type: joi.string().required(),
    description: joi.string().required(),
    value: joi.number().required()
  });

  const { error } = transactionSchema.validate(req.body);
    if(error) return res.status(422).send(error.details.map(detail => detail.message));

  if (!token) return res.status(401).send("Sem token.");
  try {
    const session = await db.collection("sessions").findOne({ token });
    if (!session) return res.status(401).send("Sem sessao");

    const cliente = await db.collection("users").findOne({ _id: session.clienteId });
    if (!cliente) return res.status(401).send("Sem usuario");

    const { type, description, value } = req.body;
    await db.collection("extrato").insertOne({
      type,
      value,
      description, 
      date: dayjs().format('DD/MM'),
      clienteId: cliente._id
    });
    res.sendStatus(201);

  } catch (error) {
    console.log("Erro ao tentar adicionar transacao");
    console.log(error);
    return res.sendStatus(500);
  } 
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log("Server running on port " + process.env.PORT);
});