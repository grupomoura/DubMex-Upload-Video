const app = require("../app");
const route = require("../routes/video_list");

app.use("/", route);

module.exports = app;