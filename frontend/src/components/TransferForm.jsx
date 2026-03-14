import { useState } from 'react';
import api from '../services/api';

function TransferForm({ accountId, onTransferSuccess }) {
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const idempotencyKey = crypto.randomUUID();
      await api.post('/transactions', {
        fromAccount: accountId,
        toAccount,
        amount: Number(amount),
        idempotencyKey,
      });
      setSuccess('Transfer successful!');
      setToAccount('');
      setAmount('');
      if (onTransferSuccess) {
        onTransferSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Transfer failed. Check balance or account details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Send Money</h3>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}

      <form onSubmit={handleTransfer} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-1 text-sm font-medium">To Account ID</label>
          <input
            type="text"
            value={toAccount}
            onChange={(e) => setToAccount(e.target.value)}
            placeholder="Recipient's Account ID"
            className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1 text-sm font-medium">Amount (Rs.)</label>
          <input
            type="number"
            min="1"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading || !accountId}
          className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? 'Processing...' : 'Send Money'}
        </button>
      </form>
    </div>
  );
}

export default TransferForm;
