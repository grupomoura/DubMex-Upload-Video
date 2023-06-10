const app = require("../app");
const route = require("../routes/audio");

app.use("/", route);

module.exports = app;