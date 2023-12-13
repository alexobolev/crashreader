use breakpad_symbols::{Symbolizer, SimpleSymbolSupplier};
use goblin::pe::{PE, options::ParseOptions};
use minidump_processor::process_minidump;
use wasm_bindgen::prelude::*;

mod crash_info;
pub use crash_info::CrashInfo;


fn parse_crash(crash_slice: &[u8], exe_slice: Option<&[u8]>) -> Result<CrashInfo, String> {
    let runtime = tokio::runtime::Builder::new_current_thread().build()
        .map_err(|err| err.to_string())?;

    let dump = minidump::Minidump::read(crash_slice)
        .map_err(|err| err.to_string())?;
    let symbolizer = Symbolizer::new(SimpleSymbolSupplier::new(vec![]));
    let crash_info = runtime.block_on(process_minidump(&dump, &symbolizer))
        .map_err(|err| err.to_string())?;

    let exe_info = if let Some(slice) = exe_slice {
        let (resolve_rva, parse_attribute_certificates) = (true, false);
        let executable = PE::parse_with_opts(slice, &ParseOptions { resolve_rva, parse_attribute_certificates })
            .map_err(|err| err.to_string())?;

        Some(executable)
    } else {
        None
    };

    Ok(CrashInfo::new(crash_info, exe_info))
}

#[wasm_bindgen]
pub fn wa_parse_crash(crash_slice: Box<[u8]>, exe_slice: Option<Box<[u8]>>) -> Result<JsValue, JsValue> {
    match parse_crash(crash_slice.as_ref(), exe_slice.as_deref()) {
        Ok(info) => Ok(serde_wasm_bindgen::to_value(&info)?),
        Err(error) => Err(JsValue::from_str(&error)),
    }
}
