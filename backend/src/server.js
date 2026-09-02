const express = require('express');
const cors = require('cors');
const cardsRoutes = require('./routes/cards');

const app = express();
const PORT = 3000;

const db = require('./database');

app.use(cors());
app.use(express.json());
app.use('/api/cards', cardsRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'API Wiki-Masters fonctionne !'
    });
});

app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 AS result');

        res.json({
            message: 'Connexion MySQL réussie !',
            result: rows[0].result
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Erreur de connexion à MySQL'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});

