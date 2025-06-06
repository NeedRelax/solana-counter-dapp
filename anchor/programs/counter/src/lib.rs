use anchor_lang::prelude::*;

declare_id!("WGh22MoY3HGgDmgHFonx7mYTvu7j6yafbRYA4fDVBKE");

#[program]
pub mod counter {
    use super::*;
    // 初始化指令处理器
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter_account = &mut ctx.accounts.counter;
        counter_account.count = 0;
        // 设置所有者
        counter_account.authority = ctx.accounts.authority.key();
        msg!("Counter initialized with count: 0");
        Ok(())
    }
    // 增加指令处理器
    pub fn increment(ctx: Context<Update>) -> Result<()> {
        let counter_account = &mut ctx.accounts.counter;
        // 检查调用者是否是 authority
        // 来自账户数据 和 来自当前调用者（签名账户） 对比
        // if counter_account.authority != ctx.accounts.authority.key() {
        //     return err!(CounterError::Unauthorized);
        // }
        counter_account.count += 1;
        msg!("Counter incremented. New count: {}", counter_account.count);
        Ok(())
    }
    // 增加指令处理器
    pub fn decrement(ctx: Context<Update>) -> Result<()> {
        let counter_account = &mut ctx.accounts.counter;
        // 检查调用者是否是 authority
        // 来自账户数据 和 来自当前调用者（签名账户） 对比
        // if counter_account.authority != ctx.accounts.authority.key() {
        //     return err!(CounterError::Unauthorized);
        // }
        if counter_account.count == 0 {
            return err!(CounterError::CannotDecrementZero);
        }
        counter_account.count -= 1;
        msg!("Counter decremented. New count: {}", counter_account.count);
        Ok(())
    }
    // (可选) 设置新的计数值
    pub fn set(ctx: Context<Set>, value: u64) -> Result<()> {
        let counter_account = &mut ctx.accounts.counter;
        // 检查调用者是否是 authority
        // if counter_account.authority != ctx.accounts.authority.key() {
        //     return err!(CounterError::Unauthorized);
        // }

        counter_account.count = value;
        msg!("Counter set to: {}", counter_account.count);
        Ok(())
    }
    // 新增：close 指令
    // 这个指令会关闭 counter 账户，并将租金返还给 authority
    pub fn close(_ctx: Context<Close>) -> Result<()> {
        msg!("Counter account closed");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    // 'init' 表示创建这个账户
    // 'payer = authority' 表示 authority 将支付账户创建的租金
    // 'space = 8 + 8 + 32' 是账户需要存储数据的空间大小：
    //   8 bytes for Anchor discriminator (账户类型标识)
    //   8 bytes for u64 count
    //   32 bytes for Pubkey authority
    #[account(init, payer = authority, space= 8 + 8 + 32)]
    pub counter: Account<'info, CounterAccount>,
    #[account(mut)] // authority 需要是可变的，因为他要支付租金
    pub authority: Signer<'info>, // Signer 表示这个账户必须对交易进行签名
    pub system_program: Program<'info, System>, // 系统程序，用于创建账户
}

#[derive(Accounts)]
pub struct Update<'info> {
    // 'mut' 表示这个账户的数据将会被修改
    // 'has_one = authority' 是一个约束，确保传入的 authority 账户与 CounterAccount 中存储的 authority 匹配
    #[account(mut, has_one = authority)]
    pub counter: Account<'info, CounterAccount>,
    pub authority: Signer<'info>, // 只有这个账户可以调用 increment
}
// 定义 `set` 指令需要的账户
#[derive(Accounts)]
pub struct Set<'info> {
    // 'mut' 确保这个账户的数据被修改
    // 'has_one = authority' 确保传入的 authority 账户与 CounterAccount 中存储的 authority 匹配
    #[account(mut, has_one = authority)]
    pub counter: Account<'info, CounterAccount>,
    pub authority: Signer<'info>,
}
#[derive(Accounts)]
pub struct Close<'info> {
    // 'mut' - 因为我们要关闭它
    // 'close = authority' - 指定租金返还给 authority 账户
    // 'has_one = authority' - 确保只有所有者才能关闭它
    #[account(mut, close = authority, has_one = authority)]
    pub counter: Account<'info, CounterAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
}
// 定义计数器账户的状态结构
#[account]
pub struct CounterAccount {
    pub authority: Pubkey, // 账户的所有者
    pub count: u64,        // 计数器的值
}

#[error_code]
pub enum CounterError {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("Cannot decrement counter when it is already zero.")]
    CannotDecrementZero,
}
