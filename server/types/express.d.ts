/** Align Express session user with our JWT auth payload ({ id }). */
export {};

declare global {
  namespace Express {
    interface User {
      id: string;
    }
  }
}
