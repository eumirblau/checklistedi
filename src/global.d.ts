// Global type definitions for React Native
declare global {
  // Console API (available in React Native)
  interface Console {
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    info(...args: any[]): void;
    debug(...args: any[]): void;
  }

  var console: Console;

  // Require function for React Native assets
  declare function require(name: string): any;

  // Global fetch (available in React Native)
  declare function fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}

export {};
