const app = require("../app");
const route = require("../routes/searsh_videos");

app.use("/", route);

module.exports = app;