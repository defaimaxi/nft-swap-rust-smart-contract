import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Cercols } from "../target/types/cercols";
import { expect } from "chai";

describe("cercols", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Cercols as Program<Cercols>;

  const collectionMint = new anchor.web3.PublicKey(
    "J1S9H3QjnRtBbbuD4HjPV6RpRhwuk4zKbxsnCHuTgh9w"
  );

  const [poolPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("cercols_pool"),
      collectionMint.toBuffer(),
      program.provider.publicKey.toBytes(),
    ],
    program.programId
  );

  const swapFeeLamports = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);

  it("Is initialized!", async () => {
    const tx = await program.methods
      .initPool(swapFeeLamports)
      .accounts({ collectionMint, pool: poolPda })
      .rpc();
    console.log("Your transaction signature", tx);

    const account = await program.account.poolState.fetch(poolPda);

    expect(account.collectionMint.toBase58()).to.eq(collectionMint.toBase58());
    expect(account.authority.toBase58()).to.eq(
      anchor.getProvider().publicKey.toBase58()
    );
    expect(account.swapFeeLamports.toNumber()).to.eq(
      swapFeeLamports.toNumber()
    );
    expect(account.size).to.eq(0);
  });
});
