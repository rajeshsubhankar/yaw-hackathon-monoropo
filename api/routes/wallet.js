var express = require('express');
var router = express.Router();

router.get('/', (req, res, ext) => {
  res.send('create wallet successful');
});

module.exports = router;
