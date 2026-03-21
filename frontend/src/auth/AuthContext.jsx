import React from 'react';

export const AuthContext = React.createContext({
  user: null,
  configured: true,
  signInGoogle: async () => {},
  signInEmail: async () => {},
  signUpEmail: async () => {},
  signOutUser: async () => {},
});

export const useAuth = () => React.useContext(AuthContext);
