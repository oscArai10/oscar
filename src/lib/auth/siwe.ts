import { SiweMessage } from "siwe";

// Wallet users get a deterministic synthetic email so they map 1:1 to a
// Supabase auth user. They never receive mail at this address.
export const WALLET_EMAIL_DOMAIN = "wallet.oscar";

export function walletEmail(address: string): string {
  return `${address.toLowerCase()}@${WALLET_EMAIL_DOMAIN}`;
}

// MUST stay printable ASCII. EIP-4361's ABNF grammar restricts `statement` to
// ASCII and siwe v3 enforces it strictly, so a single non-ASCII character (an
// em-dash, a curly quote) makes prepareMessage() throw
// "invalid message: max line number was 6" and breaks wallet sign-in entirely.
// The em-dash used everywhere else in this project is invalid here.
const SIWE_STATEMENT =
  "Sign in to oscAr. This is a signature request only, and it costs no gas and never moves funds.";

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
    statement: SIWE_STATEMENT,
    uri: params.uri,
    version: "1",
    chainId: params.chainId,
    nonce: params.nonce,
  });
}

export const NONCE_COOKIE = "oscar_siwe_nonce";
