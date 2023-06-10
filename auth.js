const apiKey = require('./config');

const API_KEY = apiKey;

// Middleware de autenticação
const authenticate = (req, res, next) => {
  const apiKey = req.headers['api-key'];

  if (apiKey && apiKey === API_KEY) {
    // A autenticação é bem-sucedida, continua para a próxima rota
    next();
  } else {
    // A chave de API está ausente ou é inválida
    res.status(401).json({ error: 'Acesso não autorizado.' });
  }
};

module.exports = authenticate