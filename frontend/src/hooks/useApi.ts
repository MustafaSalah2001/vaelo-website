import { useEffect, useState, type DependencyList } from 'react';
import { ApiError } from '../api/client';

export interface ApiState<T> {
  data: T | undefined;
  error: ApiError | Error | undefined;
  loading: boolean;
}

/** Runs an API call on mount and whenever `deps` change; cancels in-flight requests. */
export function useApi<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: DependencyList): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ data: undefined, error: undefined, loading: true });

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fetcher(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, error: undefined, loading: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ data: undefined, error: error instanceof Error ? error : new Error(String(error)), loading: false });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

export const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404;
