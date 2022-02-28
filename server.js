const express = require('express');

const app = express();

app.post('/notify', (req, res) => {
    console.log(req.body);
  });

app.get('/', (req, res) => {
  res.send('Successful response.');
});

app.listen(3000, () => console.log('Example app is listening on port 3000.'));
