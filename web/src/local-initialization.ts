import { LocalDataError } from './local-experience';

export const LOCAL_INITIALIZATION_MS = 5000;
/** Only the optional initial open+read budget. It never controls a Game action. */
export function initializeLocal<T>(
  controller: AbortController,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const signal = controller.signal;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (success: boolean, value: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      if (success) resolve(value as T);
      else reject(value);
    };
    const cancel = () =>
      finish(
        false,
        signal.reason instanceof LocalDataError
          ? signal.reason
          : new LocalDataError(
              'LOCAL_ABORTED',
              '本次本地设置读取已取消，旧数据保留。',
            ),
      );
    const timer = setTimeout(
      () =>
        controller.abort(
          new LocalDataError(
            'LOCAL_INIT_TIMEOUT',
            '本地设置读取超过5000毫秒；旧数据未覆盖。',
          ),
        ),
      LOCAL_INITIALIZATION_MS,
    );
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) {
      cancel();
      return;
    }
    Promise.resolve()
      .then(() => work(signal))
      .then(
        (value) => finish(true, value),
        (error) => finish(false, error),
      );
  });
}
