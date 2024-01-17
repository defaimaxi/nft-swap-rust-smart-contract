import * as anchor from "@coral-xyz/anchor";
import * as token from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import { Cercols } from "../target/types/cercols";
import { expect } from "chai";

describe("cercols", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Cercols as Program<Cercols>;

  const metadataProgram = new anchor.web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  const collectionMint = new anchor.web3.PublicKey(
    "CKPYygUZ9aA4JY7qmyuvxT67ibjmjpddNtHJeu1uQBSM"
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
    "EGUZ1sDcA36amdE7KBHe2JRSTCRdM48PiJ6ZVX6PcL4D"
  );
  const nftToken = new anchor.web3.PublicKey(
    "5ad2gME71CcTyP61zx3gqmKF2wsHvAsDdAyeEC2dBNPX"
  );
  const nftMetadata = new anchor.web3.PublicKey(
    "Ewo9HX1gdHC4nwVQ8bRw9Bu1NRLZpuSK8dwjjvSBEYBS"
  );
  const nftEdition = new anchor.web3.PublicKey(
    "2HQrHAZXc81UUFjSNs45prxiu9PPaJqVjYKu26UpLm9E"
  );

  const nftCustody = token.getAssociatedTokenAddressSync(
    nftMint,
    nftAuthorityPda,
    true
  );

  const [sourceTokenRecord] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("metadata"),
      metadataProgram.toBytes(),
      nftMint.toBytes(),
      anchor.utils.bytes.utf8.encode("token_record"),
      nftToken.toBytes(),
    ],
    program.programId
  );

  const [destinationTokenRecord] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("metadata"),
      metadataProgram.toBytes(),
      nftMint.toBytes(),
      anchor.utils.bytes.utf8.encode("token_record"),
      nftCustody.toBytes(),
    ],
    program.programId
  );

  const authRulesProgram = new anchor.web3.PublicKey(
    "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg"
  );

  const sysvarInstructions = new anchor.web3.PublicKey(
    "Sysvar1nstructions1111111111111111111111111"
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

  it("Can deposit an NFT from the collection", async () => {
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
        // sourceTokenRecord,
        // destinationTokenRecord,
        metadataProgram,
        sysvarInstructions,
        // authRulesProgram,
      })
      .rpc();

    console.log("TX: ", tx);
  });
});
