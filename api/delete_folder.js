const app = require("../app");
const route = require("../routes/delete_folder");

app.use("/", route);

module.exports = app;