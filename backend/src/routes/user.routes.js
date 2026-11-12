const express = require('express');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const { getProfile, updateProfile, changePassword, getAllUsers, deleteUser } = require('../controllers/user.controller');

const userRouter = express.Router();

// apply protection to all user routes
userRouter.use(protect);

// user routes
userRouter.get('/profile', getProfile);
userRouter.put('/profile', updateProfile);
userRouter.put('/change-password', changePassword);

// admin routes
userRouter.use(authorize('admin'));
userRouter.get('/', getAllUsers);
userRouter.delete('/:id', deleteUser);

module.exports = userRouter;