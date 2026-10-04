import "react-native-get-random-values";
import * as ExpoCrypto from "expo-crypto";

/**
 * Better Auth / Neon Auth expect `globalThis.crypto` (Web Crypto). Hermes does not provide it.
 * Must load before `@neondatabase/neon-js/auth` or any auth client module.
 */
type GlobalWithCrypto = typeof globalThis & { crypto?: Crypto };

function getCrypto(): Crypto {
  const root = globalThis as GlobalWithCrypto;
  if (!root.crypto) {
    root.crypto = {} as Crypto;
  }
  return root.crypto;
}

const crypto = getCrypto();

if (typeof crypto.randomUUID !== "function") {
  crypto.randomUUID = (() => ExpoCrypto.randomUUID()) as Crypto["randomUUID"];
}
