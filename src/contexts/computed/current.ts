export const handleEnsureNotZero = async (
  sig: AbortSignal,
  _hash: string,
  block: number,
  price: number,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (block !== 0 && price !== 0) resolve("Success");
    const timer = setTimeout(reject, 10_000);
    sig.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve("Success");
    });
  });
};
