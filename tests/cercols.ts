import * as anchor from "@coral-xyz/anchor";
import * as token from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import { Cercols } from "../target/types/cercols";
import { expect } from "chai";
import {
  TransactionBuilderSendAndConfirmOptions,
  createSignerFromKeypair,
  generateSigner,
  percentAmount,
  publicKey,
  signerIdentity,
  sol,
  some,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  MPL_TOKEN_METADATA_PROGRAM_ID,
  createNft,
  createProgrammableNft,
  findMetadataPda,
  mplTokenMetadata,
  verifyCollectionV1,
} from "@metaplex-foundation/mpl-token-metadata";
import { readFileSync } from "fs";
import path from "path";
import { findAssociatedTokenPda } from "@metaplex-foundation/mpl-toolbox";

describe("cercols", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  console.log("provider", anchor.AnchorProvider.defaultOptions());

  anchor.setProvider(provider);

  const program = anchor.workspace.Cercols as Program<Cercols>;

  const umi = createUmi(provider.connection.rpcEndpoint).use(
    mplTokenMetadata()
  );

  // Use the same config as Anchor
  const sendAndConfirmOptions: TransactionBuilderSendAndConfirmOptions = {
    send: { commitment: "processed", preflightCommitment: "processed" },
    confirm: { commitment: "processed" },
  };

  // Umi needs the keypair from disk
  const keyFileContents = JSON.parse(
    readFileSync(
      path.join(process.env.HOME, ".config/solana/id.json")
    ).toString()
  );

  const signer = umi.eddsa.createKeypairFromSecretKey(
    new Uint8Array(keyFileContents)
  );

  umi.use(signerIdentity(createSignerFromKeypair(umi, signer)));

  // Collection Mint
  const collectionMint = generateSigner(umi);
  const collectionMintPubkey = new anchor.web3.PublicKey(
    collectionMint.publicKey
  );

  // NFT of the collection - must be owned by the Signer
  const nftMint2 = generateSigner(umi);
  const nftMint2Pubkey = new anchor.web3.PublicKey(nftMint2.publicKey);

  const nftToken = findAssociatedTokenPda(umi, {
    mint: nftMint2.publicKey,
    owner: umi.identity.publicKey,
  });
  const nftTokenPubkey = new anchor.web3.PublicKey(publicKey(nftToken));

  const nftMetadata = findMetadataPda(umi, { mint: nftMint2.publicKey });

  const metadataProgram = new anchor.web3.PublicKey(
    MPL_TOKEN_METADATA_PROGRAM_ID
  );

  const [poolPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("cercols_pool"),
      collectionMintPubkey.toBuffer(),
      program.provider.publicKey.toBytes(),
    ],
    program.programId
  );

  const [nftAuthorityPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("nft_authority"), poolPda.toBytes()],
    program.programId
  );

  const nftCustody = token.getAssociatedTokenAddressSync(
    nftMint2Pubkey,
    nftAuthorityPda,
    true
  );

  const [sourceTokenRecord] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("metadata"),
      metadataProgram.toBytes(),
      nftMint2Pubkey.toBytes(),
      anchor.utils.bytes.utf8.encode("token_record"),
      nftTokenPubkey.toBytes(),
    ],
    program.programId
  );

  const [destinationTokenRecord] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("metadata"),
      metadataProgram.toBytes(),
      nftMint2Pubkey.toBytes(),
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

  before(async () => {
    await umi.rpc.airdrop(umi.payer.publicKey, sol(10));

    await createNft(umi, {
      mint: collectionMint,
      name: "Cercols Collection",
      uri: "https://cercols/collection",
      sellerFeeBasisPoints: percentAmount(5),
      isCollection: true,
    }).sendAndConfirm(umi, sendAndConfirmOptions);

    await createProgrammableNft(umi, {
      mint: nftMint2,
      tokenOwner: umi.identity.publicKey,
      name: "Cercols #1",
      uri: "https://cercols/1",
      sellerFeeBasisPoints: percentAmount(2),
      collection: some({ key: collectionMint.publicKey, verified: false }),
    }).sendAndConfirm(umi, sendAndConfirmOptions);

    await verifyCollectionV1(umi, {
      metadata: nftMetadata,
      collectionMint: collectionMint.publicKey,
      authority: umi.payer,
    }).sendAndConfirm(umi, sendAndConfirmOptions);

    // console.log("tx", tx);
  });

  // after(async () => {});

  it("Is initialized!", async () => {
    await program.methods
      .initPool(swapFeeLamports)
      .accounts({
        collectionMint: collectionMintPubkey,
        pool: poolPda,
        nftAuthority: nftAuthorityPda,
      })
      .rpc();

    const account = await program.account.poolState.fetch(poolPda);

    expect(account.collectionMint.toBase58()).to.eq(
      collectionMintPubkey.toBase58()
    );
    expect(account.authority.toBase58()).to.eq(
      anchor.getProvider().publicKey.toBase58()
    );
    expect(account.swapFeeLamports.toNumber()).to.eq(
      swapFeeLamports.toNumber()
    );
    expect(account.size).to.eq(0);
  });

  // it("Can deposit an NFT from the collection", async () => {
  //   const tx = await program.methods
  //     .deposit()
  //     .accounts({
  //       pool: poolPda,
  //       nftAuthority: nftAuthorityPda,
  //       nftMint,
  //       nftToken,
  //       nftMetadata,
  //       nftEdition,
  //       nftCustody,
  //       sourceTokenRecord,
  //       destinationTokenRecord,
  //       metadataProgram,
  //       sysvarInstructions,
  //       authRulesProgram,
  //     })
  //     .rpc();

  //   console.log("TX: ", tx);
  // });
});
