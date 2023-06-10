const app = require("../app");
const route = require("../routes/channel_video");

app.use("/", route);

module.exports = app;