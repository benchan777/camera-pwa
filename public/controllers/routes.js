const express = require('express');
const path = require('path');
const router = express.Router();

// Routes
router.get('/', (req, res) => {
    res.render('home')
})

router.get('/get-model', (req, res) => {
    res.header("Content-Type", 'application/json');
    res.sendFile('model.json', { root: path.join(__dirname, '../model') })
})

router.get('/group1-shard1of7.bin', (req, res) => {
    res.sendFile('group1-shard1of7.bin', { root: path.join(__dirname, '../model') })
})

router.get('/group1-shard2of7.bin', (req, res) => {
    res.sendFile('group1-shard2of7.bin', { root: path.join(__dirname, '../model') })
})

router.get('/group1-shard3of7.bin', (req, res) => {
    res.sendFile('group1-shard3of7.bin', { root: path.join(__dirname, '../model') })
})

router.get('/group1-shard4of7.bin', (req, res) => {
    res.sendFile('group1-shard4of7.bin', { root: path.join(__dirname, '../model') })
})

router.get('/group1-shard4of7.bin', (req, res) => {
    res.sendFile('group1-shard4of7.bin', { root: path.join(__dirname, '../model') })
})

router.get('/group1-shard5of7.bin', (req, res) => {
    res.sendFile('group1-shard5of7.bin', { root: path.join(__dirname, '../model') })
})

router.get('/group1-shard6of7.bin', (req, res) => {
    res.sendFile('group1-shard6of7.bin', { root: path.join(__dirname, '../model') })
})

router.get('/group1-shard7of7.bin', (req, res) => {
    res.sendFile('group1-shard7of7.bin', { root: path.join(__dirname, '../model') })
})

module.exports = router;