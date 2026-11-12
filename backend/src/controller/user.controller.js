const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');
const { recordAudit } = require('../utils/audit');

const getProfile = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true, dob: true, country: true, idType: true, idNumber: true, createdAt: true }
        });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) { next(error); }
};

const updateProfile = async (req, res, next) => {
    try {
        const { name, country, dob, idType, idNumber } = req.body;
        const data = {};

        if (name !== undefined && name !== null) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({ success: false, error: 'Name is required' });
            }
            data.name = name.trim();
        }
        if (country !== undefined) data.country = country === '' ? null : country;
        if (idNumber !== undefined) data.idNumber = idNumber === '' ? null : idNumber;

        if (idType !== undefined) {
            let mapped = idType;
            if (idType === 'national-id') mapped = 'national_id';
            if (idType === 'drivers-license') mapped = 'drivers_license';
            data.idType = idType === '' || idType === null ? null : mapped;
        }

        if (dob !== undefined) {
            data.dob = dob === '' || dob === null ? null : new Date(dob);
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ success: false, error: 'No profile fields to update' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data,
            select: { id: true, name: true, email: true, role: true, country: true, dob: true, idType: true, idNumber: true, createdAt: true }
        });
        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) { next(error); }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Please provide both current and new passwords' });
        }
        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
        }
        
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Incorrect current password' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });
        
        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) { next(error); }
};

// Admin handlers
const getAllUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, createdAt: true, lastLoginAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) { next(error); }
};

const deleteUser = async (req, res, next) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ success: false, error: 'You cannot delete your own account' });
        }

        // Read the account before deleting it: once the row is gone the audit
        // entry could only name a uuid, which is useless when reviewing who was
        // removed.
        const target = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: { id: true, name: true, email: true, role: true }
        });
        if (!target) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        await prisma.user.delete({ where: { id: req.params.id } });

        recordAudit(req, {
            action: 'user.delete',
            targetType: 'user',
            targetId: target.id,
            targetLabel: target.name,
            metadata: { email: target.email, role: target.role }
        });

        res.status(200).json({ success: true, message: 'User deleted' });
    } catch (error) { next(error); }
};

module.exports = { getProfile, updateProfile, changePassword, getAllUsers, deleteUser };