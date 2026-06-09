//! [`IdlBuild`] for [`U16LenVec`](super::u16_len_vec::U16LenVec) (hand-written IDL shape; wire uses u16 len).

#[cfg(feature = "idl-build")]
use std::collections::BTreeMap;

#[cfg(feature = "idl-build")]
use anchor_lang::idl::build::IdlBuild;
#[cfg(feature = "idl-build")]
use anchor_lang::idl::types::IdlTypeDef;

#[cfg(feature = "idl-build")]
use super::u16_len_vec::U16LenVec;
#[cfg(feature = "idl-build")]
use super::RawCpiPatch;

#[cfg(feature = "idl-build")]
const U16_LEN_VEC_IDL_NAME: &str = "U16LenVec";

#[cfg(feature = "idl-build")]
fn register_u16_len_vec(types: &mut BTreeMap<String, IdlTypeDef>) {
    if types.contains_key(U16_LEN_VEC_IDL_NAME) {
        return;
    }
    let ty: IdlTypeDef =
        serde_json::from_str(include_str!("u16_len_vec_idl_type.json")).expect("u16_len_vec_idl_type.json");
    types.insert(U16_LEN_VEC_IDL_NAME.to_string(), ty);
}

#[cfg(feature = "idl-build")]
macro_rules! impl_idl_build_u16_len_vec {
    ($t:ty, $insert:expr) => {
        impl IdlBuild for U16LenVec<$t> {
            fn insert_types(types: &mut BTreeMap<String, IdlTypeDef>) {
                register_u16_len_vec(types);
                $insert(types);
            }
        }
    };
}

#[cfg(feature = "idl-build")]
impl_idl_build_u16_len_vec!(u8, |_| ());
#[cfg(feature = "idl-build")]
impl_idl_build_u16_len_vec!(RawCpiPatch, |types| RawCpiPatch::insert_types(types));
