function BalanceCard({ user, balance }) {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white mb-6">
      <h2 className="text-2xl font-bold mb-2">Welcome {user?.name || 'User'}</h2>
      <p className="text-blue-100 mb-4">Account ID: {user?.id || 'N/A'}</p>
      <div>
        <h3 className="text-sm uppercase tracking-wider text-blue-200">Account Balance</h3>
        <p className="text-4xl font-bold">Rs. {balance?.toFixed(2) || '0.00'}</p>
      </div>
    </div>
  );
}

export default BalanceCard;
