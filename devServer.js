const app = require("./app");
const routes = require("./src/routes/router");
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv').config();
app.use(bodyParser.json());


app.use("/", routes);

app.use('/download', express.static('downloads'));
// Configuração do middleware para fazer o parsing do corpo das requisições como JSON
app.use(express.json());

//start server locally
app.listen(5000,function () {
    console.log("Server started. Go to http://localhost:5000/");
});