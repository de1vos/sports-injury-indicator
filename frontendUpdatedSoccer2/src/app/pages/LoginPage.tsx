import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Navigation } from '../components/Navigation';
import { FavoritesContext } from '../hooks/useFavorites';

const EMPTY_FAVORITES = {
  favorites: new Set<string>(),
  toggleFavorite: () => {},
  isFavorite: () => false,
  favoriteCount: 0,
  favoritePlayers: [],
};

export function LoginPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [session, navigate]);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <FavoritesContext.Provider value={EMPTY_FAVORITES}>
      <div className="hero-net min-h-screen bg-gradient-to-b from-[#1A56DB] via-[#2563EB] to-[#4A7FE8] flex items-center justify-center px-4 pt-16">
        <Navigation />

        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-8">
            <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2 text-center">Welcome</h2>
            <p className="text-sm text-[#6B7280] text-center mb-8">
              Sign in to save your favourite players and track their injury risk across devices.
            </p>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border-2 border-[#E5E7EB] rounded-xl hover:border-[#1A56DB] hover:bg-[#F5F6FA] transition-all font-semibold text-[#1A1A2E] shadow-sm"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full mt-3 py-3 px-4 rounded-xl text-sm font-medium text-[#6B7280] hover:text-[#1A56DB] hover:bg-[#F5F6FA] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </FavoritesContext.Provider>
  );
}
