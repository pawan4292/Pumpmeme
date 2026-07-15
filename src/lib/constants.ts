// Real UCT coinId confirmed from live wallet history
export const UCT_COIN_ID =
  'f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0';

// Creation fee in UCT (real transfer, seeds bonding curve reserve)
export const CREATION_FEE_UCT = 2;

// Graduation threshold in UCT market cap
export const GRADUATION_THRESHOLD_UCT = 500;

// Bonding curve slope constant (determines price sensitivity)
// price = CURVE_SLOPE * supply  (linear bonding curve)
export const CURVE_SLOPE = 0.000001; // UCT per token unit

// Sphere testnet2 configuration (public key, not a secret)
export const SPHERE_ORACLE_API_KEY = 'sk_ddc3cfcc001e4a28ac3fad7407f99590';
export const SPHERE_WALLET_API_BASE_URL = 'https://wallet-api.unicity.network';
export const SPHERE_NETWORK = 'testnet' as const;
export const SPHERE_NETWORK_ID = 4; // testnet2 networkId

// Sphere wallet URL for Connect popup
export const SPHERE_WALLET_URL = 'https://sphere.unicity.network';

// Token decimals for UCT
export const UCT_DECIMALS = 8;

// App metadata
export const APP_NAME = 'PumpMeme';
export const APP_DESCRIPTION = 'Create, pump, and trade memecoins';
export const APP_TAGLINE = 'PumpMeme — Memecoin Launchpad on Unicity';

// Testnet explorer base URL (for tx links)
export const TESTNET_EXPLORER_URL = 'https://explorer.testnet2.unicity.network';
