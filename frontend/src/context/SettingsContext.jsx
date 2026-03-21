import React, { createContext, useContext, useState, useEffect } from 'react';
import { convertAllFinancialData } from '../data/currencyConversion';

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];

const SettingsContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  currency: 'INR',
  setCurrency: () => {},
  currencySymbol: '₹',
  isConvertingCurrency: false,
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [theme,    setThemeState]    = useState(() => localStorage.getItem('em_theme')    || 'dark');
  const [currency, setCurrencyState] = useState(() => localStorage.getItem('em_currency') || 'INR');
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);

  // Apply theme to <html> and persist
  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem('em_theme', t);
  };

  const setCurrency = async (nextCurrency) => {
    const fromCurrency = currency;
    const toCurrency = String(nextCurrency || '').trim();

    if (!toCurrency || toCurrency === fromCurrency) return;
    if (isConvertingCurrency) return;

    setIsConvertingCurrency(true);
    try {
      await convertAllFinancialData(fromCurrency, toCurrency);
      setCurrencyState(toCurrency);
      localStorage.setItem('em_currency', toCurrency);
    } catch (err) {
      alert(err?.message || 'Currency conversion failed. Please try again.');
    } finally {
      setIsConvertingCurrency(false);
    }
  };

  // Sync theme attr on mount + whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Set initial on first mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []); // eslint-disable-line

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '₹';

  return (
    <SettingsContext.Provider value={{ theme, setTheme, currency, setCurrency, currencySymbol, CURRENCIES, isConvertingCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
