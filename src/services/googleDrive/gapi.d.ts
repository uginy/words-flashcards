/* eslint-disable @typescript-eslint/no-explicit-any */
// Google API типы - внешнее API, использует any

declare global {
  interface Window {
    gapi: {
      load: (apis: string, options: { callback: () => void; onerror: () => void }) => void;
      client: {
        init: (config: any) => Promise<void>;
        setToken: (token: { access_token: string } | null) => void;
        drive: {
          files: {
            list: (params: any) => Promise<any>;
            create: (params: any) => Promise<any>;
            get: (params: any) => Promise<any>;
          };
        };
        request: (params: any) => Promise<any>;
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: () => void;
          };
          hasGrantedAllScopes: (token: any, ...scopes: string[]) => boolean;
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
    // Для обратной совместимости
    gapi_auth2_token?: string;
  }
}

export type {};
