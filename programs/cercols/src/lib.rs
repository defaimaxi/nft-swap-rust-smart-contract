use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, TokenAccount, Token, Transfer, transfer}, 
    metadata::{MetadataAccount, MasterEditionAccount, Metadata},
    associated_token::AssociatedToken
};

declare_id!("FjZVUx8ergLAEaB1Mucqizhk9XtQTZpnAffS5FBT2h4c");

#[program]
pub mod cercols {
    use super::*;

    pub fn init_pool(ctx: Context<InitPool>, swap_fee_lamports: u64) -> Result<()> {
        // Initialize a pool
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.user.key();
        pool.collection_mint = ctx.accounts.collection_mint.key();
        pool.swap_fee_lamports = swap_fee_lamports;
        pool.size = 0;
        pool.pool_bump = ctx.bumps.pool;
        pool.nft_auth_bump = ctx.bumps.nft_authority;
        
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>) -> Result<()> {
        // Deposit collection items in the pool
        let pool = &mut ctx.accounts.pool;
        pool.size = pool.size.checked_add(1).unwrap();

        transfer(ctx.accounts.deposit_nft_ctx(), 1)?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        Ok(())
    }

    pub fn swap(ctx: Context<Swap>) -> Result<()> {
        Ok(())
    }

    pub fn close_pool(ctx: Context<ClosePool>) -> Result<()> {
        Ok(())
    }
}

#[account]
pub struct PoolState { // 8
    /// The creator of the pool (32)
    authority: Pubkey, // 32
    /// The verified collection address of the NFT (32)
    collection_mint: Pubkey, // 32
    /// The fee in lamports for swapping in the pool
    swap_fee_lamports: u64, // 8
    /// The number of items currently in the pool
    size: u32, // 4
    /// The bump of pool details PDA (1)
    pool_bump: u8, // 1
    /// The bump of NFT authority PDA (1)
    nft_auth_bump: u8 // 1
    // TOTAL: 86
}

#[derive(Accounts)]
#[instruction(swap_fee_lamports: u64)]
pub struct InitPool<'info> {
    #[account(
        init, 
        payer = user, 
        seeds = [b"cercols_pool", collection_mint.key().as_ref(), user.key().as_ref()], 
        bump, 
        space = 86
    )]
    pub pool: Account<'info, PoolState>,

    #[account(mint::decimals = 0)]
    pub collection_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: This account is not read or written
    #[account(
        seeds = [b"nft_authority", pool.key().as_ref()],
        bump
    )]
    pub nft_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut, 
        seeds = [
            b"cercols_pool", 
            pool.collection_mint.as_ref(), 
            pool.authority.as_ref()
        ], 
        bump = pool.pool_bump
    )]
    pub pool: Account<'info, PoolState>,

    #[account(mint::decimals = 0, constraint = nft_mint.supply == 1)]
    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut, 
        associated_token::mint = nft_mint, 
        associated_token::authority = user, 
        constraint = nft_token.amount == 1
    )]
    pub nft_token: Account<'info, TokenAccount>,
    
    #[account(
        seeds = [b"metadata", Metadata::id().as_ref(), nft_mint.key().as_ref()],
        seeds::program = Metadata::id(),
        bump,
        constraint = nft_metadata.collection.as_ref().unwrap().verified,
        constraint = nft_metadata.collection.as_ref().unwrap().key == pool.collection_mint
    )]
    pub nft_metadata: Box<Account<'info, MetadataAccount>>,

    #[account(
        seeds = [b"metadata",
            Metadata::id().as_ref(),
            nft_mint.key().as_ref(),
            b"edition"
        ],
        seeds::program = Metadata::id(),
        bump
    )]
    pub nft_edition: Box<Account<'info, MasterEditionAccount>>,

    /// CHECK: This account is not read or written
    #[account(seeds = [b"nft_authority", pool.key().as_ref()], bump = pool.nft_auth_bump)]
    pub nft_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = user, 
        associated_token::mint = nft_mint, 
        associated_token::authority = nft_authority
    )]
    pub nft_custody: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>

}

impl<'info> Deposit<'info> {
    pub fn deposit_nft_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.nft_token.to_account_info(),
            to: self.nft_custody.to_account_info(),
            authority: self.user.to_account_info()
        };

        let cpi_program = self.token_program.clone().to_account_info();

        CpiContext::new(cpi_program, cpi_accounts)
    }
}

#[derive(Accounts)]
pub struct Withdraw {}

#[derive(Accounts)]
pub struct Swap {}

#[derive(Accounts)]
pub struct ClosePool {}
