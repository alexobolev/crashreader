use breakpad_symbols::{Symbolizer, SimpleSymbolSupplier};
use goblin::pe::{PE, options::ParseOptions};
use minidump_processor::process_minidump;
use wasm_bindgen::prelude::*;

mod crash_info;
mod disassembler;

pub use crash_info::CrashInfo;


fn parse_crash(crash_slice: &[u8], exe_slice: &[u8]) -> Result<CrashInfo, String> {
    let runtime = tokio::runtime::Builder::new_current_thread().build()
        .map_err(|err| err.to_string())?;

    let dump = minidump::Minidump::read(crash_slice)
        .map_err(|err| err.to_string())?;
    let symbolizer = Symbolizer::new(SimpleSymbolSupplier::new(vec![]));
    let crash_info = runtime.block_on(process_minidump(&dump, &symbolizer))
        .map_err(|err| err.to_string())?;

    let opts = ParseOptions { resolve_rva: true, parse_attribute_certificates: false };
    let exe_info = PE::parse_with_opts(exe_slice, &opts)
        .map_err(|err| err.to_string())?;

    Ok(CrashInfo::new(crash_info, exe_info, exe_slice))
}

#[wasm_bindgen]
pub fn wa_parse_crash(crash_slice: Box<[u8]>, exe_slice: Box<[u8]>) -> Result<JsValue, JsValue> {
    match parse_crash(crash_slice.as_ref(), exe_slice.as_ref()) {
        Ok(info) => Ok(serde_wasm_bindgen::to_value(&info)?),
        Err(error) => Err(JsValue::from_str(&error)),
    }
}
