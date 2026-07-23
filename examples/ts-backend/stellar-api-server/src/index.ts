import express from 'express';

const app = express();
app.use(express.json());

interface PaymentRequest {
  destination: string;
  amount: string;
}

app.post('/api/payments', async (req, res) => {
  try {
    const { destination, amount } = req.body as PaymentRequest;
    res.json({ success: true, hash: 'placeholder_tx_hash', destination, amount });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/accounts/:address', async (req, res) => {
  try {
    res.json({
      address: req.params.address,
      balances: [{ type: 'native', balance: '10000.0' }],
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: 'Account not found' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API server running on port \'));