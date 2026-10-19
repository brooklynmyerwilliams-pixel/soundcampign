export type CryptoAsset = "USDT-TRC20" | "ETH" | "BTC";

export const CRYPTO_ASSETS: { key: CryptoAsset; name: string; network: string; address: string }[] = [
  { key: "USDT-TRC20", name: "USDT", network: "TRC-20 (Tron)", address: "TQn9Y2khES4rGqLh2Xb7pV1yLm8Fa5dK3c" },
  { key: "ETH", name: "Ethereum", network: "ERC-20", address: "0x7A3fD2e9C41b58aE0c6D5b1F84ea2C9b7D31F0aE" },
  { key: "BTC", name: "Bitcoin", network: "Bitcoin Network", address: "bc1qk8f3m2v9xr7t4jw5s6q0hlz2ap8ycd3nue4rg9" },
];

export const MIN_WITHDRAWAL = 10;

/** Notes can carry structured tokens like `addr:<wallet>` and `proof:<path>`. */
export function walletFromNote(note: string | null | undefined): string | null {
  const m = /addr:(\S+)/.exec(note ?? "");
  return m ? m[1]! : null;
}

export function noteText(note: string | null | undefined): string {
  return (note ?? "").replace(/\b(addr|proof):\S+/g, "").replace(/\s+/g, " ").trim();
}

export function withWalletNote(note: string, address: string): string | null {
  const clean = noteText(note);
  const addr = address.trim();
  const out = [clean, addr ? `addr:${addr}` : ""].filter(Boolean).join(" ").trim();
  return out || null;
}

/** 1Jt2UpX4..............dUAMFh3DiCbJw */
export function shortAddress(address: string): string {
  const a = address.trim();
  if (a.length <= 24) return a;
  return `${a.slice(0, 8)}..............${a.slice(-13)}`;
}
