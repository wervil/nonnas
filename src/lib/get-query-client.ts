import { QueryClient, isServer } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error: any) => {
          // Don't retry on auth errors
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        /// Retry delay is Total 5 seconds
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
        gcTime: 20 * 60 * 1000, // 20 minutes
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
