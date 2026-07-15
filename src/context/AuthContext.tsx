import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/firebase/config';

export type CounterRole = 'B1' | 'B2'; // B1 = Inside, B2 = Outside

type LoginCredentials = {
  username: string;
  password: string;
};

type CounterAccount = {
  role: CounterRole;
  username: string;
  email: string;
  demoPassword?: string;
};

const COUNTER_ACCOUNTS: CounterAccount[] = [
  {
    role: 'B1',
    username: import.meta.env.VITE_COUNTER_B1_USERNAME || 'b1',
    email: import.meta.env.VITE_COUNTER_B1_EMAIL || 'b1@frydaddy.local',
    demoPassword: import.meta.env.VITE_COUNTER_B1_PASSWORD || 'b1',
  },
  {
    role: 'B2',
    username: import.meta.env.VITE_COUNTER_B2_USERNAME || 'b2',
    email: import.meta.env.VITE_COUNTER_B2_EMAIL || 'b2@frydaddy.local',
    demoPassword: import.meta.env.VITE_COUNTER_B2_PASSWORD || 'b2',
  },
];

interface AuthContextType {
  counter: CounterRole | null;
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [counter, setCounterState] = useState<CounterRole | null>(() => {
    const storedCounter = localStorage.getItem('restaurant_counter');
    return storedCounter === 'B1' || storedCounter === 'B2' ? storedCounter : null;
  });
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser?.email) {
        const account = COUNTER_ACCOUNTS.find(
          (entry) => entry.email.toLowerCase() === firebaseUser.email?.toLowerCase()
        );

        if (account) {
          localStorage.setItem('restaurant_counter', account.role);
          setCounterState(account.role);
        }
      } else {
        localStorage.removeItem('restaurant_counter');
        setCounterState(null);
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async ({ username, password }: LoginCredentials) => {
    setIsLoading(true);
    try {
      const normalizedUsername = username.trim().toLowerCase();
      const account = COUNTER_ACCOUNTS.find(
        (entry) => entry.username.toLowerCase() === normalizedUsername
      );

      if (!account) {
        throw new Error('Invalid username or password.');
      }

      if (isFirebaseConfigured && auth) {
        await signInWithEmailAndPassword(auth, account.email, password);
      } else if (!account.demoPassword || account.demoPassword !== password) {
        throw new Error('Invalid username or password.');
      }

      localStorage.setItem('restaurant_counter', account.role);
      setCounterState(account.role);
    } catch (error) {
      localStorage.removeItem('restaurant_counter');
      setCounterState(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem('restaurant_counter');
      setCounterState(null);

      if (isFirebaseConfigured && auth) {
        await signOut(auth);
      }
    } catch (error) {
      console.error('Failed to log out from Firebase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ counter, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

