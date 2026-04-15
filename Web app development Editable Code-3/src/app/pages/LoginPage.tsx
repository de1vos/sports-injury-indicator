import { useState } from 'react';
import { Navigation } from '../components/Navigation';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login/signup logic here
    console.log('Login:', { username, password, isCreatingAccount });
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <Navigation />
      <div className="pt-16 min-h-screen bg-gradient-to-b from-[#1A56DB] via-[#4A7FE8] to-[#7BA5F5] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-1">SI2</h1>
          <p className="text-sm text-white/90">Soccer Injury Indicator</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-8">
          <h2 className="text-xl font-semibold text-[#1A1A2E] mb-6 text-center">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#1A1A2E] mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#F5F6FA] rounded-xl border border-transparent focus:border-[#1A56DB] focus:outline-none transition-colors text-[#1A1A2E]"
                placeholder="Enter your username"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1A1A2E] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#F5F6FA] rounded-xl border border-transparent focus:border-[#1A56DB] focus:outline-none transition-colors text-[#1A1A2E]"
                placeholder="Enter your password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-[#1A56DB] text-white font-semibold rounded-xl hover:bg-[#0D47A1] transition-colors shadow-md mt-6"
            >
              Log In
            </button>
          </form>

          {/* Toggle Between Login/Register */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsCreatingAccount(!isCreatingAccount)}
              className="text-[#1A56DB] hover:underline text-sm font-medium"
            >
              Don't have an account? Create one
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
