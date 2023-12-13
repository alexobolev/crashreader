use breakpad_symbols::{Symbolizer, SimpleSymbolSupplier};
use minidump_processor::process_minidump;
use wasm_bindgen::prelude::*;

mod data;
pub use data::*;


fn parse_crash(slice: &[u8]) -> Result<CrashInfo, String> {
    let runtime = tokio::runtime::Builder::new_current_thread().build()
        .map_err(|err| err.to_string())?;

    let dump = minidump::Minidump::read(slice)
        .map_err(|err| err.to_string())?;

    let symbolizer = Symbolizer::new(SimpleSymbolSupplier::new(vec![]));
    let process = runtime.block_on(process_minidump(&dump, &symbolizer))
        .map_err(|err| err.to_string())?;

    Ok(CrashInfo::new(process))
}

#[wasm_bindgen]
pub fn wa_parse_crash(slice: Box<[u8]>) -> Result<JsValue, JsValue> {
    match parse_crash(slice.as_ref()) {
        Ok(info) => Ok(serde_wasm_bindgen::to_value(&info)?),
        Err(error) => Err(JsValue::from_str(&error)),
    }
}
