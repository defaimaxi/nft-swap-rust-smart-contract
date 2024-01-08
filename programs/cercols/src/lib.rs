use anchor_lang::prelude::*;
use anchor_spl::{metadata::{MetadataAccount}, token::Mint};
// use mpl_token_metadata::accounts::Metadata;

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
        msg!("ctx: {:?}", ctx.accounts.pool.collection_mint.to_string());
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>) -> Result<()> {
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
    authority: Pubkey, // 32
    collection_mint: Pubkey, // 32
    swap_fee_lamports: u64, // 8
    size: u32, // 4
    // TOTAL: 84
}

#[derive(Accounts)]
#[instruction(swap_fee_lamports: u64)]
pub struct InitPool<'info> {
    #[account(init, payer = user, seeds = [b"cercols_pool", collection_mint.key().as_ref()], bump, space = 84 )]
    pub pool: Account<'info, PoolState>,

    pub collection_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit {}

#[derive(Accounts)]
pub struct Withdraw {}

#[derive(Accounts)]
pub struct Swap {}

#[derive(Accounts)]
pub struct ClosePool {}
