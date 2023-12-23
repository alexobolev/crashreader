use breakpad_symbols::{Symbolizer, SimpleSymbolSupplier};
use goblin::pe::{PE, options::ParseOptions};
use minidump_processor::process_minidump;
use serde::Serialize;
use serde_wasm_bindgen::Serializer as WasmSerializer;
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

    let digest = CrashInfo::new(crash_info, exe_info, exe_slice);
    if digest.checksum_dump != digest.checksum_exe {
        Err(String::from("crash dump was not generated from provided executable"))?;
    }

    Ok(digest)
}

#[wasm_bindgen]
pub fn wa_parse_crash(crash_slice: Box<[u8]>, exe_slice: Box<[u8]>) -> Result<JsValue, JsValue> {
    let serializer = WasmSerializer::new().serialize_large_number_types_as_bigints(true);
    match parse_crash(crash_slice.as_ref(), exe_slice.as_ref()) {
        Ok(info) => Ok(info.serialize(&serializer)?),
        Err(error) => Err(JsValue::from_str(&error)),
    }
}
