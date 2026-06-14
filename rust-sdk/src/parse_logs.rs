//! Parse simulation / RPC logs for Ifx error codes.

/// One parsed log line.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ParsedIfxLog {
    pub raw: String,
    pub kind: ParsedIfxLogKind,
    pub instruction_index: Option<u32>,
    pub error_name: Option<String>,
    pub error_code: Option<u32>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ParsedIfxLogKind {
    IfxError,
    InstructionFailed,
    ProgramFailed,
    Other,
}

/// Parse all log lines.
pub fn parse_ifx_logs(logs: &[String]) -> Vec<ParsedIfxLog> {
    logs.iter().map(|l| parse_ifx_log_line(l)).collect()
}

/// First Ifx-named error in logs, if any.
pub fn first_ifx_error_in_logs(logs: &[String]) -> Option<ParsedIfxLog> {
    parse_ifx_logs(logs)
        .into_iter()
        .find(|l| l.kind == ParsedIfxLogKind::IfxError)
}

fn parse_ifx_log_line(raw: &str) -> ParsedIfxLog {
    if let Some(idx) = parse_instruction_index(raw) {
        return ParsedIfxLog {
            raw: raw.to_string(),
            kind: ParsedIfxLogKind::InstructionFailed,
            instruction_index: Some(idx),
            error_name: None,
            error_code: None,
        };
    }
    if let Some((name, code)) = parse_anchor_error(raw) {
        return ParsedIfxLog {
            raw: raw.to_string(),
            kind: ParsedIfxLogKind::IfxError,
            instruction_index: None,
            error_name: Some(name),
            error_code: Some(code),
        };
    }
    if let Some((name, code)) = parse_custom_program_error(raw) {
        return ParsedIfxLog {
            raw: raw.to_string(),
            kind: ParsedIfxLogKind::IfxError,
            instruction_index: None,
            error_name: Some(name),
            error_code: Some(code),
        };
    }
    let lower = raw.to_lowercase();
    if lower.contains("program") && lower.contains("failed") {
        return ParsedIfxLog {
            raw: raw.to_string(),
            kind: ParsedIfxLogKind::ProgramFailed,
            instruction_index: None,
            error_name: None,
            error_code: None,
        };
    }
    ParsedIfxLog {
        raw: raw.to_string(),
        kind: ParsedIfxLogKind::Other,
        instruction_index: None,
        error_name: None,
        error_code: None,
    }
}

fn parse_instruction_index(raw: &str) -> Option<u32> {
    let marker = "instruction #";
    let lower = raw.to_lowercase();
    let pos = lower.find(marker)?;
    let rest = &raw[pos + marker.len()..];
    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    digits.parse().ok()
}

fn parse_anchor_error(raw: &str) -> Option<(String, u32)> {
    let marker = "Error Code: ";
    let start = raw.find(marker)? + marker.len();
    let rest = &raw[start..];
    let name: String = rest
        .chars()
        .take_while(|c| c.is_ascii_alphanumeric() || *c == '_')
        .collect();
    let code = ifx_error_code_by_name(&name)?;
    Some((name, code))
}

fn parse_custom_program_error(raw: &str) -> Option<(String, u32)> {
    let marker = "custom program error: 0x";
    let lower = raw.to_lowercase();
    let pos = lower.find(marker)?;
    let hex_start = pos + marker.len();
    let hex: String = raw[hex_start..]
        .chars()
        .take_while(|c| c.is_ascii_hexdigit())
        .collect();
    let parsed = u32::from_str_radix(&hex, 16).ok()?;
    if let Some(name) = ifx_error_name(parsed) {
        return Some((name.to_string(), parsed));
    }
    let low = parsed & 0xff;
    if let Some(name) = ifx_error_name_by_low_byte(low) {
        return Some((name.to_string(), ifx_error_code_by_name(name)?));
    }
    None
}

fn ifx_error_name_by_low_byte(low: u32) -> Option<&'static str> {
    const NAMES: [&str; 8] = [
        "LetNotTopLevel",
        "TapeOutOfBounds",
        "UnauthorizedClose",
        "InvalidAuthority",
        "InvalidTapeLen",
        "AssertFailed",
        "IfElseRevert",
        "AssertFailedMulti",
    ];
    NAMES.into_iter().find(|name| {
        ifx_error_code_by_name(name)
            .map(|c| c & 0xff == low)
            .unwrap_or(false)
    })
}

fn ifx_error_name(code: u32) -> Option<&'static str> {
    match code {
        6000 => Some("LetNotTopLevel"),
        6001 => Some("TapeOutOfBounds"),
        6002 => Some("UnauthorizedClose"),
        6003 => Some("InvalidAuthority"),
        6004 => Some("InvalidTapeLen"),
        6005 => Some("AssertFailed"),
        6006 => Some("IfElseRevert"),
        6039 => Some("AssertFailedMulti"),
        _ => None,
    }
}

fn ifx_error_code_by_name(name: &str) -> Option<u32> {
    match name {
        "LetNotTopLevel" => Some(6000),
        "TapeOutOfBounds" => Some(6001),
        "UnauthorizedClose" => Some(6002),
        "InvalidAuthority" => Some(6003),
        "InvalidTapeLen" => Some(6004),
        "AssertFailed" => Some(6005),
        "IfElseRevert" => Some(6006),
        "AssertFailedMulti" => Some(6039),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_assert_failed() {
        let logs = vec!["Program log: AnchorError occurred. Error Code: AssertFailed.".to_string()];
        let parsed = parse_ifx_logs(&logs);
        assert_eq!(parsed[0].kind, ParsedIfxLogKind::IfxError);
        assert_eq!(parsed[0].error_name.as_deref(), Some("AssertFailed"));
    }
}
