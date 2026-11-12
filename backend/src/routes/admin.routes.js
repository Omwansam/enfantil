const express = require('express');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const { listAuditLog } = require('../controllers/admin.controller');
const {
    listBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
} = require('../controllers/bankAccount.controller');
const {
    importStatement,
    listStatements,
    listStatementLines,
    settleStatementLine,
    ignoreStatementLine,
} = require('../controllers/reconciliation.controller');

const adminRouter = express.Router();

// Everything under /api/v1/admin is admin-only, without exception.
adminRouter.use(protect, authorize('admin'));

adminRouter.get('/audit', listAuditLog);

// Bank accounts back the wire instructions investors are shown, so these are
// admin-only like everything else under /admin.
adminRouter.get('/bank-accounts', listBankAccounts);
adminRouter.post('/bank-accounts', createBankAccount);
adminRouter.put('/bank-accounts/:id', updateBankAccount);
adminRouter.delete('/bank-accounts/:id', deleteBankAccount);

// Reconciliation. Settling a line moves real money, so these sit behind the
// same admin gate as everything else here.
adminRouter.get('/statements', listStatements);
adminRouter.post('/statements', importStatement);
adminRouter.get('/statement-lines', listStatementLines);
adminRouter.post('/statement-lines/:id/settle', settleStatementLine);
adminRouter.post('/statement-lines/:id/ignore', ignoreStatementLine);

module.exports = adminRouter;