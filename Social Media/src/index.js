// require('dotenv').config() - Below is the better approach
import {} from "dotenv/config"
import connectDB from "./db/index.js"
import { app } from "./app.js"

const PORT = process.env.PORT || 8000

connectDB()
.then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on ${PORT}`)
    })
})
.catch((error) => {
    console.error("Failed to connect to DB!! ", error)
})