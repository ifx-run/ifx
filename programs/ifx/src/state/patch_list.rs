//! [`PatchList`] on [`super::types::Cpi`]: wire is [`U16LenVec`] — `u16` LE count + [`RawCpiPatch`] entries.
//! Empty list = static CPI step (template `data` invoked as-is).

use super::types::RawCpiPatch;
use super::u16_len_vec::U16LenVec;

pub type PatchList = U16LenVec<RawCpiPatch>;
