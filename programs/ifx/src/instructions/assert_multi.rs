use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::set_return_data;

use crate::{
    error::ErrorCode,
    pseudocode,
    state::{eval_bool, AssertMultiArgs, FrameAccount},
};

use super::assert::Assert;

pub fn handler<'info>(ctx: Context<'info, Assert<'info>>, args: AssertMultiArgs) -> Result<()> {
    require!(!args.conds.is_empty(), ErrorCode::InvalidInstructionData);
    FrameAccount::try_from(ctx.accounts.frame.as_ref())?.with_read(|tape| {
        for (i, cond) in args.conds.iter().enumerate() {
            let ok = eval_bool(&tape, cond)?;
            pseudocode::log_assert_multi(i, cond, ok);
            if !ok {
                let index = u8::try_from(i).map_err(|_| ErrorCode::InvalidInstructionData)?;
                set_return_data(&[index]);
                return err!(ErrorCode::AssertFailedMulti);
            }
        }
        Ok(())
    })
}
