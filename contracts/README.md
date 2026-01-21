# RiverEvents contract

Full source: `RiverEvents.sol`. Solidity `^0.8.24`, MIT, no external imports.

1. Compile with Solidity 0.8.24 or a compatible 0.8.x compiler, for example in Remix.
2. Deploy to your chosen EVM testnet. No constructor arguments. The deploying wallet becomes the immutable organizer.
3. From the organizer wallet call `create(id, opens, closes, capacity)`. Use IDs 1, 2 and 3 for the frontend events. Times are Unix seconds; closing must be after opening and in the future. Capacity must be positive.
4. Copy the root `.env.example` to `.env.local`. Set `VITE_EVENT_CONTRACT` to the deployed address and `VITE_CHAIN_ID` to the chain ID in hexadecimal. The default `0x14a34` is Base Sepolia. Restart Vite or rebuild.
5. Connect a wallet and use an event's onchain check-in. `join(id)` requires an open event, available capacity and no prior attendance by that address. It sends zero value; network gas is still required.

Read state: `organizer()`, `tournaments(id)`, `joined(id, wallet)`. Events: `Created` and `Joined`.

The frontend reports transaction submission, not mined confirmation; follow it in the wallet. Selector calculation uses the wallet RPC method `web3_sha3`, which the provider must support. No private key is included or needed in the frontend.

This is an attendance registry, not a wagering, randomness or poker settlement contract. Source is included unchanged, not audited or deployed.

## Local compilation
Run `npm run contracts:compile` from the project root. The pinned Solidity 0.8.24 compiler produces `contracts/artifacts/RiverEvents.json` with ABI and bytecode. The ZIP includes this compiled artifact. Compilation is verified; deployment and wallet transaction execution are not performed.
