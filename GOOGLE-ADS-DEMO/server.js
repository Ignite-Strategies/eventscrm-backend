import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the popup HTML
app.get('/auth/popup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth-popup.html'));
});

// Handle fake authentication
app.post('/auth/fake', (req, res) => {
  const { email, password } = req.body;
  
  console.log('🔐 Fake auth attempt:', { email, password });
  
  // Hardcoded demo credentials
  if (email === 'name@gmail.com' && password === 'hardcodedpw') {
    console.log('✅ Fake auth SUCCESS');
    
    // Return fake Google Ads tokens
    const tokens = {
      access_token: 'fake_access_token_' + Date.now(),
      refresh_token: 'fake_refresh_token_xyz123',
      developer_token: 'fake_developer_token_abc456',
      login_customer_id: '123-456-7890',
      expires_in: 3600,
      token_type: 'Bearer',
      email: email
    };
    
    res.json({
      success: true,
      tokens
    });
  } else {
    console.log('❌ Fake auth FAILED');
    res.status(401).json({
      success: false,
      error: 'Invalid credentials. Try name@gmail.com / hardcodedpw'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Fake OAuth server running on http://localhost:${PORT}`);
  console.log(`📝 Auth popup: http://localhost:${PORT}/auth/popup`);
});

