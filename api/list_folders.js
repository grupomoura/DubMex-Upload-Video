const app = require("../app");
const route = require("../routes/list_folders");

app.use("/", route);

module.exports = app;