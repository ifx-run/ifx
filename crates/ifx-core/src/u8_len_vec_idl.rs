//! [`IdlBuild`] for [`U8LenVec`](super::u8_len_vec::U8LenVec).
//!
//! Each instantiation has its own IDL name so the field can point at a defined type.
//! The struct is empty: Anchor IDL has no `u8`-count vector, and a Borsh `vec` would
//! be a `u32` length. Instruction bytes stay in the SDK codecs.

#[cfg(feature = "idl-build")]
use std::collections::BTreeMap;

#[cfg(feature = "idl-build")]
use anchor_lang::idl::build::IdlBuild;
#[cfg(feature = "idl-build")]
use anchor_lang::idl::types::IdlTypeDef;

#[cfg(feature = "idl-build")]
use super::u8_len_vec::U8LenVec;
#[cfg(feature = "idl-build")]
use crate::wire::{Expr, LetBinding, ReturnDataLet};

#[cfg(feature = "idl-build")]
fn len_vec_type(name: &str, elem: &str) -> IdlTypeDef {
    let raw = format!(
        r#"{{
  "name": "{name}",
  "docs": [
    "Sequence with a u8 element count (max 255). Element type: {elem}.",
    "On-chain bytes are count:u8 then each element in Borsh order. This IDL struct has no fields; Anchor has no u8-count vector. Encode with the Ifx SDK codecs."
  ],
  "type": {{
    "kind": "struct",
    "fields": []
  }}
}}"#,
    );
    serde_json::from_str(&raw).unwrap_or_else(|err| panic!("{name} idl json: {err}"))
}

#[cfg(feature = "idl-build")]
fn insert_elem<T: IdlBuild>(types: &mut BTreeMap<String, IdlTypeDef>) {
    if let Some(ty) = T::create_type() {
        types.insert(T::get_full_path(), ty);
        T::insert_types(types);
    }
}

#[cfg(feature = "idl-build")]
impl IdlBuild for U8LenVec<LetBinding> {
    fn create_type() -> Option<IdlTypeDef> {
        Some(len_vec_type("U8LenVecLetBinding", "LetBinding"))
    }

    fn insert_types(types: &mut BTreeMap<String, IdlTypeDef>) {
        insert_elem::<LetBinding>(types);
    }

    fn get_full_path() -> String {
        "U8LenVecLetBinding".to_string()
    }
}

#[cfg(feature = "idl-build")]
impl IdlBuild for U8LenVec<Expr> {
    fn create_type() -> Option<IdlTypeDef> {
        Some(len_vec_type("U8LenVecExpr", "Expr"))
    }

    fn insert_types(types: &mut BTreeMap<String, IdlTypeDef>) {
        insert_elem::<Expr>(types);
    }

    fn get_full_path() -> String {
        "U8LenVecExpr".to_string()
    }
}

#[cfg(feature = "idl-build")]
impl IdlBuild for U8LenVec<ReturnDataLet> {
    fn create_type() -> Option<IdlTypeDef> {
        Some(len_vec_type("U8LenVecReturnDataLet", "ReturnDataLet"))
    }

    fn insert_types(types: &mut BTreeMap<String, IdlTypeDef>) {
        insert_elem::<ReturnDataLet>(types);
    }

    fn get_full_path() -> String {
        "U8LenVecReturnDataLet".to_string()
    }
}
