const app = require("../app");
const route = require("../routes/video");

app.use("/", route);

module.exports = app;