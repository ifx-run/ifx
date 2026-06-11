//! [`IdlBuild`] for [`U8LenVec`](super::u8_len_vec::U8LenVec).

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
const U8_LEN_VEC_IDL_NAME: &str = "U8LenVec";

#[cfg(feature = "idl-build")]
fn register_u8_len_vec(types: &mut BTreeMap<String, IdlTypeDef>) {
    if types.contains_key(U8_LEN_VEC_IDL_NAME) {
        return;
    }
    let ty: IdlTypeDef = serde_json::from_str(include_str!("u8_len_vec_idl_type.json"))
        .expect("u8_len_vec_idl_type.json");
    types.insert(U8_LEN_VEC_IDL_NAME.to_string(), ty);
}

#[cfg(feature = "idl-build")]
impl IdlBuild for U8LenVec<Expr> {
    fn insert_types(types: &mut BTreeMap<String, IdlTypeDef>) {
        register_u8_len_vec(types);
        Expr::insert_types(types);
    }
}
