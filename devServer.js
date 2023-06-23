require('dotenv').config();
const app = require("./app");
const routes = require("./src/routes/router");
const express = require('express');
const bodyParser = require('body-parser');
const port = process.env.PORT || 3000

app.use(bodyParser.json());
app.use("/", routes);

app.use('/download', express.static('downloads'));
// Configuração do middleware para fazer o parsing do corpo das requisições como JSON
app.use(express.json());

//start server locally
app.listen(port,function () {
    console.log("Server started. Go to http://localhost:3000/");
});