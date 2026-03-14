const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")

/**
 * Create a new transaction
 *
 * THE 10-STEP TRANSFER FLOW:
 * 1. Validate request
 * 2. Validate idempotency key
 * 3. Check account status
 * 4. Derive sender balance from ledger
 * 5. Create transaction (PENDING)
 * 6. Create DEBIT ledger entry
 * 7. Create CREDIT ledger entry
 * 8. Mark transaction COMPLETED
 * 9. Commit MongoDB session
 * 10. Send email notification
 */

async function createTransaction(req, res) {

    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    /**
     * 1. Validate request
     */
    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    const amountNumber = Number(amount)

    if (isNaN(amountNumber) || amountNumber <= 0) {
        return res.status(400).json({
            message: "Amount must be a valid positive number"
        })
    }

    const fromUserAccount = await accountModel.findById(fromAccount)
    const toUserAccount = await accountModel.findById(toAccount)

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        })
    }

    /**
     * 2. Validate idempotency key
     */
    const existingTransaction = await transactionModel.findOne({ idempotencyKey })

    if (existingTransaction) {

        if (existingTransaction.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: existingTransaction
            })
        }

        if (existingTransaction.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing"
            })
        }

        if (existingTransaction.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction previously failed, retry with new idempotencyKey"
            })
        }

        if (existingTransaction.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed"
            })
        }
    }

    /**
     * 3. Check account status
     */
    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both accounts must be ACTIVE"
        })
    }

    /**
     * 4. Derive sender balance from ledger
     */
    const balance = await fromUserAccount.getBalance()

    if (balance < amountNumber) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amountNumber}`
        })
    }

    const session = await mongoose.startSession()

    try {

        session.startTransaction()

        /**
         * 5. Create transaction (PENDING)
         */
        let transaction = (await transactionModel.create([{
            fromAccount,
            toAccount,
            amount: amountNumber,
            idempotencyKey,
            status: "PENDING"
        }], { session }))[0]

        /**
         * 6. Create DEBIT ledger entry
         */
        await ledgerModel.create([{
            account: fromAccount,
            amount: amountNumber,
            transaction: transaction._id,
            type: "DEBIT"
        }], { session })

        /**
         * Simulated delay (remove in production)
         */
        await new Promise(resolve => setTimeout(resolve, 15000))

        /**
         * 7. Create CREDIT ledger entry
         */
        await ledgerModel.create([{
            account: toAccount,
            amount: amountNumber,
            transaction: transaction._id,
            type: "CREDIT"
        }], { session })

        /**
         * 8. Mark transaction COMPLETED
         */
        transaction = await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { new: true, session }
        )

        /**
         * 9. Commit MongoDB session
         */
        await session.commitTransaction()

        /**
         * 10. Send email notification
         */
        await emailService.sendTransactionEmail(
            req.user.email,
            req.user.name,
            amountNumber,
            toAccount
        )

        return res.status(201).json({
            message: "Transaction completed successfully",
            transaction
        })

    } catch (error) {

        await session.abortTransaction()

        return res.status(500).json({
            message: "Transaction failed",
            error: error.message
        })

    } finally {
        session.endSession()
    }
}



async function createInitialFundsTransaction(req, res) {

    const { toAccount, amount, idempotencyKey } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    const amountNumber = Number(amount)

    const toUserAccount = await accountModel.findById(toAccount)

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "System account not found"
        })
    }

    const session = await mongoose.startSession()

    try {

        session.startTransaction()

        const transaction = new transactionModel({
            fromAccount: fromUserAccount._id,
            toAccount,
            amount: amountNumber,
            idempotencyKey,
            status: "PENDING"
        })

        /**
         * Debit system account
         */
        await ledgerModel.create([{
            account: fromUserAccount._id,
            amount: amountNumber,
            transaction: transaction._id,
            type: "DEBIT"
        }], { session })

        /**
         * Credit user account
         */
        await ledgerModel.create([{
            account: toAccount,
            amount: amountNumber,
            transaction: transaction._id,
            type: "CREDIT"
        }], { session })

        transaction.status = "COMPLETED"

        await transaction.save({ session })

        await session.commitTransaction()

        return res.status(201).json({
            message: "Initial funds transaction completed successfully",
            transaction
        })

    } catch (error) {

        await session.abortTransaction()

        return res.status(500).json({
            message: "Initial funds transaction failed",
            error: error.message
        })

    } finally {
        session.endSession()
    }
}


module.exports = {
    createTransaction,
    createInitialFundsTransaction
}