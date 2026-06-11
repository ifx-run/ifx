mod error;
mod infer_expr_ty;
mod tape;
mod value_codec;
mod value_type_tag;

pub use error::LayoutError;
pub use infer_expr_ty::{infer_expr_ty, ExprTypeContext};
pub use tape::{plan_record_offsets, record_byte_length};
pub use value_codec::{
    decode_bool, decode_typed, encode_typed, TypedValue, ValueBytes, MAX_VALUE_LEN,
};
pub use value_type_tag::{tag_to_value_type, value_type_to_tag};
