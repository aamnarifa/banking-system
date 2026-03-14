const { Router } = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const transactionController = require("../controllers/transaction.controller")

const transactionRoutes = Router();

/**
 * - POST /api/transactions/
 * - Create a new transaction
 */

transactionRoutes.post("/", authMiddleware.authMiddleware, transactionController.createTransaction)


const adminMiddleware = require('../middleware/admin.middleware');

/**
 * - POST /api/transactions/system/initial-funds
 * - Create initial funds transaction from system user
 */
transactionRoutes.post("/system/initial-funds", authMiddleware.authSystemUserMiddleware, transactionController.createInitialFundsTransaction)

/**
 * - GET /api/transactions/
 * - Retrieve all transactions
 */
transactionRoutes.get("/", authMiddleware.authMiddleware, transactionController.getTransactions)

/**
 * - PATCH /api/transactions/:id
 * - Update transaction status
 */
transactionRoutes.patch("/:id", authMiddleware.authMiddleware, transactionController.updateTransactionStatus)

/**
 * - DELETE /api/transactions/:id
 * - Delete a transaction (Requires Admin)
 */
transactionRoutes.delete("/:id", authMiddleware.authMiddleware, adminMiddleware, transactionController.deleteTransaction)

module.exports = transactionRoutes;