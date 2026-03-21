import { createContext, useContext, useEffect } from 'react';

export const PageTitleContext = createContext({ title: '', setTitle: () => {} });

export const usePageTitle = (title) => {
  const { setTitle } = useContext(PageTitleContext);

  useEffect(() => {
    setTitle(title);
    return () => setTitle('');
  }, [title, setTitle]);
};
