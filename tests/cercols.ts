import * as anchor from "@coral-xyz/anchor";
import * as token from "@solana/spl-token";
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
      anchor.utils.bytes.utf8.encode("cercols_pool"),
      collectionMint.toBuffer(),
      program.provider.publicKey.toBytes(),
    ],
    program.programId
  );

  const [nftAuthorityPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("nft_authority"), poolPda.toBytes()],
    program.programId
  );

  // NFT of the collection - must be owned by the Signer
  const nftMint = new anchor.web3.PublicKey(
    "DskQgewLBTmPBZwWAZ5U7swcPeggpZ5eRbb6gurY1oZd"
  );
  const nftToken = new anchor.web3.PublicKey(
    "H8nooeBKDQTcp75zZoyBuMHiWjsWPWH42q3dWJn8CA3a"
  );
  const nftMetadata = new anchor.web3.PublicKey(
    "9naYoZ4uZxCPPvQPnQwzmFFnFKwrLiUNLf7sQnqWr4RN"
  );
  const nftEdition = new anchor.web3.PublicKey(
    "FkHtoHUk6kWehv6VrH1mdbgfBM7xxhmcpEubZ8cz3quq"
  );

  const nftCustody = token.getAssociatedTokenAddressSync(
    nftMint,
    nftAuthorityPda,
    true
  );

  const swapFeeLamports = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);

  it("Is initialized!", async () => {
    const tx = await program.methods
      .initPool(swapFeeLamports)
      .accounts({
        collectionMint,
        pool: poolPda,
        nftAuthority: nftAuthorityPda,
      })
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

  it.skip("Can deposit an NFT from the collection", async () => {
    const tx = await program.methods
      .deposit()
      .accounts({
        pool: poolPda,
        nftAuthority: nftAuthorityPda,
        nftMint,
        nftToken,
        nftMetadata,
        nftEdition,
        nftCustody,
      })
      .rpc();

    console.log("TX: ", tx);
  });
});
