//! [`IdlBuild`] for the program-local [`U8LenVec`](super::u8_len_vec::U8LenVec).
//!
//! Empty struct: the wire prefix is a `u8` count, which Anchor IDL cannot represent
//! as a `vec`. See `ifx-core`'s `u8_len_vec_idl.rs`.

#[cfg(feature = "idl-build")]
use std::collections::BTreeMap;

#[cfg(feature = "idl-build")]
use anchor_lang::idl::build::IdlBuild;
#[cfg(feature = "idl-build")]
use anchor_lang::idl::types::IdlTypeDef;

#[cfg(feature = "idl-build")]
use super::u8_len_vec::U8LenVec;
#[cfg(feature = "idl-build")]
use super::Expr;

#[cfg(feature = "idl-build")]
fn len_vec_expr() -> IdlTypeDef {
    serde_json::from_str(
        r#"{
  "name": "U8LenVecExpr",
  "docs": [
    "Sequence with a u8 element count (max 255). Element type: Expr.",
    "On-chain bytes are count:u8 then each element in Borsh order. This IDL struct has no fields; Anchor has no u8-count vector. Encode with the Ifx SDK codecs."
  ],
  "type": {
    "kind": "struct",
    "fields": []
  }
}"#,
    )
    .expect("U8LenVecExpr idl json")
}

#[cfg(feature = "idl-build")]
impl IdlBuild for U8LenVec<Expr> {
    fn create_type() -> Option<IdlTypeDef> {
        Some(len_vec_expr())
    }

    fn insert_types(types: &mut BTreeMap<String, IdlTypeDef>) {
        Expr::insert_types(types);
    }

    fn get_full_path() -> String {
        "U8LenVecExpr".to_string()
    }
}
