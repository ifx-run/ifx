use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    state::{frame_access::FrameReader, StructuredCpiPatch},
};

/// Build instruction `data` from typed structured patch (no template blob).
pub fn assemble_structured_cpi(
    patch: &StructuredCpiPatch,
    program_id: &Pubkey,
    frame: &impl FrameReader,
) -> Result<Vec<u8>> {
    ifx_core::structured_cpi::assemble_structured_cpi(
        patch,
        program_id,
        &FrameCtx(frame),
    )
    .map_err(map_structured_cpi_err)
}

struct FrameCtx<'a, F: FrameReader>(&'a F);

impl<'a, F: FrameReader> ifx_core::structured_cpi::StructuredCpiFrame for FrameCtx<'a, F> {
    fn read_value_type(
        &self,
        index: u8,
    ) -> std::result::Result<ifx_core::wire::ValueType, ifx_core::structured_cpi::StructuredCpiError>
    {
        self.0
            .read_value_type(index)
            .map_err(|_| ifx_core::structured_cpi::StructuredCpiError::FrameRead)
    }

    fn read_bytes(
        &self,
        index: u8,
        ty: ifx_core::wire::ValueType,
    ) -> std::result::Result<
        ifx_core::layout::ValueBytes,
        ifx_core::structured_cpi::StructuredCpiError,
    > {
        self.0
            .read_bytes(index, ty)
            .map_err(|_| ifx_core::structured_cpi::StructuredCpiError::FrameRead)
    }
}

fn map_structured_cpi_err(e: ifx_core::structured_cpi::StructuredCpiError) -> Error {
    use ifx_core::structured_cpi::StructuredCpiError;
    Error::from(match e {
        StructuredCpiError::InvalidProgram => ErrorCode::InvalidStructuredCpiProgram,
        StructuredCpiError::LoadTypeMismatch => ErrorCode::LoadTypeMismatch,
        StructuredCpiError::FrameRead => ErrorCode::InvalidValueIndex,
    })
}
