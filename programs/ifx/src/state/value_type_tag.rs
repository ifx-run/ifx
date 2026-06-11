use anchor_lang::prelude::*;

use crate::state::layout_map::map_layout_err;
use crate::state::types::ValueType;

pub use ifx_core::layout::value_type_to_tag;

pub fn tag_to_value_type(tag: u8) -> Result<ValueType> {
    ifx_core::layout::tag_to_value_type(tag).map_err(map_layout_err)
}
