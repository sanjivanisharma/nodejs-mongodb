// require('dotenv').config() - Below is the better approach
import {} from "dotenv/config"
import connectDB from "./db/index.js"

connectDB()