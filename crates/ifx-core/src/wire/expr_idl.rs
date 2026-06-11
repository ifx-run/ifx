//! Custom [`IdlBuild`] for recursive [`Expr`]: static type definition, no `insert_types` recursion.

#[cfg(feature = "idl-build")]
use anchor_lang::idl::build::IdlBuild;
#[cfg(feature = "idl-build")]
use anchor_lang::idl::types::IdlTypeDef;

#[cfg(feature = "idl-build")]
impl IdlBuild for super::Expr {
    fn create_type() -> Option<IdlTypeDef> {
        let mut ty: IdlTypeDef =
            serde_json::from_str(include_str!("expr_idl_type.json")).expect("expr_idl_type.json");
        ty.name = Self::get_full_path();
        Some(ty)
    }

    /// Do not recurse into `Expr`; operator enums are folded into `Expr` variants.
    fn insert_types(_types: &mut std::collections::BTreeMap<String, IdlTypeDef>) {}
}
