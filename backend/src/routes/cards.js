const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', async (req, res) => {
    try {
        const [cards] = await db.query('SELECT * FROM cards');

        res.json(cards);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Erreur lors de la récupération des cartes'
        });
    }
});

module.exports = router;