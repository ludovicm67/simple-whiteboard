export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let lastFunc: ReturnType<typeof setTimeout>;
  let lastRan: number | null = null;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const context = this;

    if (lastRan === null) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - (lastRan as number) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - (lastRan as number)));
    }
  } as T;
};
