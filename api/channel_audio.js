const app = require("../app");
const route = require("../routes/channel_audio");

app.use("/", route);

module.exports = app;