import React, { createContext, useContext, ReactNode } from 'react';
import { useGoogleMusicAuth, GoogleMusicAuthState } from '../hooks/useGoogleMusicAuth';
import { useGeminiAuth, GeminiAuthState } from '../hooks/useGeminiAuth';
import { ServiceType, ServiceStatus } from '../hooks/useServiceAuth';

interface ServiceAuthContextValue {
  googleMusic: GoogleMusicAuthState & {
    loginGoogleMusic: () => Promise<string | null>;
    logoutGoogleMusic: () => void;
    refreshGoogleMusic: () => void;
  };
  gemini: GeminiAuthState & {
    saveCustomApiKey: (key: string | null) => void;
    setPreferredModel: (modelName: string) => void;
    toggleLocalLlamafile: (enabled: boolean, endpoint?: string) => void;
    refreshGeminiSettings: () => void;
  };
  getServiceStatusList: () => ServiceStatus[];
}

const ServiceAuthContext = createContext<ServiceAuthContextValue | null>(null);

export const ServiceAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const googleMusic = useGoogleMusicAuth();
  const gemini = useGeminiAuth();

  const getServiceStatusList = (): ServiceStatus[] => {
    return [
      {
        service: 'google_music',
        name: 'YouTube Music / Google Music',
        isConnected: googleMusic.isAuthenticated,
        userIdentifier: googleMusic.userEmail || (googleMusic.isAuthenticated ? 'Conectado' : null),
        details: 'Permite sincronizar e buscar playlists de estudo personalizadas.',
      },
      {
        service: 'gemini',
        name: 'Google Gemini Pro / Flash AI',
        isConnected: true,
        userIdentifier: gemini.hasCustomKey ? 'Chave personalizada ativa' : 'Chave do Servidor SYNAPSE',
        details: `Modelo padrão: ${gemini.preferredModel}`,
      },
      {
        service: 'llamafile',
        name: 'Llamafile (IA Local Offline)',
        isConnected: gemini.useLocalLlamafile,
        userIdentifier: gemini.useLocalLlamafile ? gemini.llamafileEndpoint : 'Desativado',
        details: 'Execução de modelo de IA local no host para estudo offline e alta privacidade.',
      },
    ];
  };

  return (
    <ServiceAuthContext.Provider
      value={{
        googleMusic,
        gemini,
        getServiceStatusList,
      }}
    >
      {children}
    </ServiceAuthContext.Provider>
  );
};

export function useServiceAuthContext(): ServiceAuthContextValue {
  const context = useContext(ServiceAuthContext);
  if (!context) {
    throw new Error('useServiceAuthContext deve ser usado dentro de um ServiceAuthProvider.');
  }
  return context;
}
