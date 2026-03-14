import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import BalanceCard from '../components/BalanceCard';
import TransactionTable from '../components/TransactionTable';
import TransferForm from '../components/TransferForm';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { logout, user } = useAuth();

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const accountsRes = await api.get('/accounts');
      let accounts = accountsRes.data?.accounts ?? [];

      if (!accounts.length) {
        const createAccountRes = await api.post('/accounts');
        const createdAccount = createAccountRes.data?.account;
        accounts = createdAccount ? [createdAccount] : [];
      }

      const accountData = accounts[0];
      
      if (!accountData) {
        throw new Error('No account found for user');
      }
      
      const accountId = accountData._id;
      setAccount({
        id: accountId,
        name: user?.name || 'User',
        currency: accountData.currency || 'INR',
        status: accountData.status || 'ACTIVE',
      });

      try {
        const balanceRes = await api.get(`/accounts/balance/${accountId}`);
        setBalance(balanceRes.data?.balance ?? 0);
      } catch {
        setBalance(0);
      }

      const txRes = await api.get('/transactions');
      const transactionList = txRes.data?.transactions ?? [];
      const accountTransactions = transactionList
        .filter((transaction) => {
          const fromAccountId = transaction.fromAccount?._id || transaction.fromAccount;
          const toAccountId = transaction.toAccount?._id || transaction.toAccount;

          return fromAccountId === accountId || toAccountId === accountId;
        })
        .map((transaction) => {
          const fromAccountId = transaction.fromAccount?._id || transaction.fromAccount;
          const toAccountId = transaction.toAccount?._id || transaction.toAccount;
          const isCredit = toAccountId === accountId;

          return {
            ...transaction,
            direction: isCredit ? 'CREDIT' : 'DEBIT',
            counterpartyAccountId: isCredit ? fromAccountId : toAccountId,
          };
        });

      setTransactions(accountTransactions);
      
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        logout();
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  }, [logout, user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 w-full">
        <div className="text-xl text-gray-500 animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl bg-red-50 p-6 rounded-lg text-red-700 border border-red-200 shadow-sm mt-8">
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p>{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-4 bg-red-100 px-4 py-2 hover:bg-red-200 rounded text-red-800 transition font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl self-start mt-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <BalanceCard user={account} balance={balance} />
          {account?.id && (
            <TransferForm 
              accountId={account.id} 
              onTransferSuccess={fetchDashboardData} 
            />
          )}
        </div>
        <div className="lg:col-span-2">
          <TransactionTable transactions={transactions} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
