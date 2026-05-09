import "@testing-library/jest-dom";

if (!globalThis.fetch) {
  globalThis.fetch = async () => new Response("{}", { status: 200 });
}

