const express = require('express');
const app = express();

const PORT = 8001;
const urlRoute = require("./routes/url");
const { connectToMongoDB } = require("./connect");
const URL = require("./models/url");

connectToMongoDB("mongodb://localhost:27017/short-url")
.then(() => {
    console.log("Connected to MongoDB");
})
.catch((err) => {
    console.log("Error connecting to MongoDB", err);
});

app.use(express.json());
app.use("/api/links", urlRoute);

app.get("/:shortId", async (req, res) => {
    const shortId = req.params.shortId;
    const entry = await URL.findOneAndUpdate(
        { shortId }, 
        { $push: 
            { 
                visitHistory: { timestamp: Date.now() } 
            } 
        });
    if (!entry) {
        return res.status(404).json({ error: "URL not found" });
    }
    res.redirect(entry.redirectURL);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
