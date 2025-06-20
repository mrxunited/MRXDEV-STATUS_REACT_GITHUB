
import React, { createContext, useState, useContext, ReactNode } from 'react';

interface GuestReportModalContextType {
  isGuestReportModalOpen: boolean;
  openGuestReportModal: () => void;
  closeGuestReportModal: () => void;
}

const GuestReportModalContext = createContext<GuestReportModalContextType | undefined>(undefined);

export const GuestReportModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isGuestReportModalOpen, setIsGuestReportModalOpen] = useState(false);
  const openGuestReportModal = () => setIsGuestReportModalOpen(true);
  const closeGuestReportModal = () => setIsGuestReportModalOpen(false);

  return (
    <GuestReportModalContext.Provider value={{ isGuestReportModalOpen, openGuestReportModal, closeGuestReportModal }}>
      {children}
    </GuestReportModalContext.Provider>
  );
};

export const useGuestReportModal = (): GuestReportModalContextType => {
  const context = useContext(GuestReportModalContext);
  if (context === undefined) {
    throw new Error('useGuestReportModal must be used within a GuestReportModalProvider');
  }
  return context;
};
