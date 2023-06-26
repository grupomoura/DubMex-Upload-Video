const { google } = require('googleapis');
const fs = require('fs');

async function authorizeWithPrivateKey() {
  const privateKey = process.env.googleprivatekey; // Substitua pelo caminho para o arquivo da chave privada
  // const privateKey = fs.readFileSync('google-private-key.pem', 'utf8'); // Substitua pelo caminho para o arquivo da chave privada
  const clientEmail = 'polyvoices@my-n8n-project-384902.iam.gserviceaccount.com'; // Substitua pelo seu e-mail de cliente

  const auth = new google.auth.GoogleAuth({
    credentials: {
      private_key: privateKey,
      client_email: clientEmail,
    },
    scopes: ['https://www.googleapis.com/auth/drive'], // Substitua pelas permissões necessárias
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  console.log('Client de acesso:', client);
  console.log('Token de acesso:', token);
}

authorizeWithPrivateKey().catch(console.error);
