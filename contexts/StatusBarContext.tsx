import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';

type StatusBarStyle = 'light-content' | 'dark-content' | 'auto';

interface StatusBarContextType {
  statusBarStyle: StatusBarStyle;
  setStatusBarStyle: (style: StatusBarStyle) => void;
}

const StatusBarContext = createContext<StatusBarContextType | undefined>(undefined);

export const useStatusBar = () => {
  const context = useContext(StatusBarContext);
  if (!context) {
    throw new Error('useStatusBar must be used within a StatusBarProvider');
  }
  return context;
};

interface StatusBarProviderProps {
  children: ReactNode;
}

export const StatusBarProvider: React.FC<StatusBarProviderProps> = ({ children }) => {
  const [statusBarStyle, setStatusBarStyle] = useState<StatusBarStyle>('auto');

  const value = useMemo(() => ({ statusBarStyle, setStatusBarStyle }), [statusBarStyle]);

  return (
    <StatusBarContext.Provider value={value}>
      <StatusBar style={statusBarStyle} />
      {children}
    </StatusBarContext.Provider>
  );
};
