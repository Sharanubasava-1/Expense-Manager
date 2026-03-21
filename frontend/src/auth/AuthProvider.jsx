import React from 'react';
import API, { setToken, getToken } from '../api/api';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
  const configured = true;
  const [user, setUser] = React.useState(undefined);

  React.useEffect(() => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }

    API.get('/auth/me')
      .then((res) => {
        setUser(res.user || null);
      })
      .catch(() => {
        setToken(null);
        setUser(null);
      });
  }, []);

  const signInEmail = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    if (!res?.token || !res?.user) {
      throw new Error('Invalid login response');
    }
    setToken(res.token);
    setUser(res.user);
  };

  const signUpEmail = async (email, password) => {
    const res = await API.post('/auth/signup', { email, password });
    if (!res?.token || !res?.user) {
      throw new Error('Invalid signup response');
    }
    setToken(res.token);
    setUser(res.user);
  };

  const signInGoogle = async () => {};

  const signOutUser = async () => {
    try {
      await API.post('/auth/logout', {});
    } catch {
      // Ignore logout API errors and clear local session anyway.
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, configured, signInGoogle, signInEmail, signUpEmail, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}
