const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")


const app = express()

app.use(cors({
    origin: true, // Allow all origins explicitly
    credentials: true
}))


app.use(express.json())
app.use(cookieParser())

/**
 * - Routes required
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/accounts.routes")
const transactionRoutes = require("./routes/transaction.routes")

/**
 * - Use Routes
 */

app.get("/", (req, res) => {
    res.send("Ledger    Service is up and running")
})

app.use("/api/v1/auth", authRouter)
app.use("/api/v1/accounts", accountRouter)
app.use("/api/v1/transactions", transactionRoutes)

// Global error handler to catch unhandled promise rejections and other errors
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error",
        status: "failed"
    });
});

module.exports = app