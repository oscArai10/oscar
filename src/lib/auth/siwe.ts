import { SiweMessage } from "siwe";

// Wallet users get a deterministic synthetic email so they map 1:1 to a
// Supabase auth user. They never receive mail at this address.
export const WALLET_EMAIL_DOMAIN = "wallet.oscar";

export function walletEmail(address: string): string {
  return `${address.toLowerCase()}@${WALLET_EMAIL_DOMAIN}`;
}

/** Builds the SIWE message a user signs. Isomorphic (used on the client). */
export function buildSiweMessage(params: {
  address: string;
  chainId: number;
  nonce: string;
  domain: string;
  uri: string;
}): SiweMessage {
  return new SiweMessage({
    domain: params.domain,
    address: params.address,
    statement:
      "Sign in to oscAr. This is a signature request only — it costs no gas and never moves funds.",
    uri: params.uri,
    version: "1",
    chainId: params.chainId,
    nonce: params.nonce,
  });
}

export const NONCE_COOKIE = "oscar_siwe_nonce";
