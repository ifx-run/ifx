//! Patch list on [`super::cpi::Cpi::RawPatched`]: `u16` LE count + [`RawCpiPatch`] entries.

use super::raw_cpi_patch::RawCpiPatch;
use crate::U16LenVec;

pub type PatchList = U16LenVec<RawCpiPatch>;
