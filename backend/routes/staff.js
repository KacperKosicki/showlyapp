const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');

router.get('/', async (req, res) => {
    const { profileId } = req.query;
    const q = { ...(profileId ? { profileId } : {}) };
    const staff = await Staff.find(q).lean();
    res.json(staff);
});

router.post('/', async (req, res) => {
    const s = await Staff.create(req.body);
    res.status(201).json(s);
});

router.patch('/:id', async (req, res) => {
    const s = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(s);
});

router.delete('/:id', async (req, res) => {
    const s = await Staff.findByIdAndDelete(req.params.id);
    res.json(s);
});


module.exports = router;
