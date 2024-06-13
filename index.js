const express = require("express");
const app = express();
const PORT = 8001;
const getRoutes = require("./routes/routes.js");

app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

app.use("/api/v1", getRoutes);

app.listen(PORT, () => {
  console.log(`server is listning on ${PORT}`);
});
