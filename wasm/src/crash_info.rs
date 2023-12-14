// use std::fmt::Write;
use std::time::{UNIX_EPOCH, SystemTime};

use goblin::pe::PE;
use minidump::MinidumpModule;
use minidump_processor::ProcessState;
use serde::Serialize;

use crate::disassembler::Disassembler;


#[derive(Clone, Debug, Serialize)]
pub struct CrashInfoMetadata {
    pub module_name: String,
    pub module_base: u64,
    pub process_id: Option<u32>,
    pub process_timestamp: Option<u64>,
    pub dump_timestamp: u64,
}

#[derive(Clone, Debug, Serialize)]
pub struct CrashInfoSystem {
    pub os_build: Option<String>,
    pub os_version: Option<String>,
    pub cpu_ident: Option<String>,
    pub cpu_microcode: u64,
    pub cpu_count: u64,
}

#[derive(Clone, Debug, Serialize)]
pub struct CrashInfoModule {
    pub name: String,
    pub image_base: u64,
    pub image_size: u32,
}

#[derive(Clone, Debug, Serialize)]
pub struct CrashInfoException {
    pub reason: String,
    pub address: u64,
}

#[derive(Clone, Debug, Serialize)]
pub struct CrashInfoThread {
    pub id: u32,
    pub name: Option<String>,
    pub dbg_info: String,
    pub frames: Vec<CrashInfoThreadFrame>,
}

#[derive(Clone, Debug, Serialize)]
pub struct CrashInfoThreadFrame {
    pub instruction: u64,
    pub resume_address: u64,
    pub module_name: Option<String>,
    pub trust: String,
    pub resolved_rva: Option<u64>,
    pub resolved_disasm: Option<Vec<(usize, String)>>,
    pub resolved_disasm_sel: usize,
}

#[derive(Clone, Debug, Serialize)]
pub struct ExeInfo {
    pub name: Option<String>,
    pub is_64bit: bool,
    pub entry_point: u64,
    pub image_base: u64,
    pub exports: Vec<ExeInfoExport>,
    pub imports: Vec<ExeInfoImport>,
    pub sections: Vec<ExeInfoSection>,
}

#[derive(Clone, Debug, Serialize)]
pub struct ExeInfoExport {
    pub name: Option<String>,
    pub offset: Option<u64>,
    pub rva: u64,
    pub size: u64,
}

#[derive(Clone, Debug, Serialize)]
pub struct ExeInfoImport {
    pub name: String,
    pub dll_name: String,
    pub ordinal: u16,
    pub offset: u64,
    pub rva: u64,
    pub size: u64,
}

#[derive(Clone, Debug, Serialize)]
pub struct ExeInfoSection {
    pub name: String,
    pub size: u64,
    pub offset: u64,
    pub ptr_raw: u64,
}

#[derive(Clone, Debug, Serialize)]
pub struct CrashInfo {
    pub metadata: CrashInfoMetadata,
    pub system: CrashInfoSystem,
    pub modules: Vec<CrashInfoModule>,
    pub exception: Option<CrashInfoException>,
    pub threads: Vec<CrashInfoThread>,
    pub thread_id: Option<u64>,
    pub executable: ExeInfo,
}

impl CrashInfo {
    pub fn new(crash_info: ProcessState, exe_info: PE<'_>, exe_slice: &[u8]) -> Self {
        // We'll calculate call frame RVAs, but only within the main module.
        let first_module = crash_info.modules.main_module()
            .expect("failed to find main module");

        // We'll filter out main module call frames not in the .text section.
        let text_section = exe_info.sections.iter()
            .find(|section| matches!(section.name(), Ok(".text")))
            .expect("failed to find .text section");

        // Offset to subtract from RVA to get offset into executable.
        let exe_to_rva_offset = text_section.virtual_address as usize
            - text_section.pointer_to_raw_data as usize;

        // Calculates relative `address` if it's in the main `module`.
        let resolve_rva = |module: &MinidumpModule, address: u64| {
            if module.raw.checksum == first_module.raw.checksum {
                Some(address - module.raw.base_of_image)
            } else {
                None
            }
        };

        // Converts a `SystemTime` to a unix timestamp (in milliseconds).
        let to_unix = |timestamp: SystemTime| {
            timestamp.duration_since(UNIX_EPOCH)
                .map(|duration| duration.as_millis() as u64)
                .unwrap_or(u64::MIN)
        };

        let mut digest = Self {
            metadata: CrashInfoMetadata {
                module_name: first_module.name.clone(),
                module_base: first_module.raw.base_of_image,
                process_id: crash_info.process_id,
                process_timestamp: crash_info.process_create_time.map(to_unix),
                dump_timestamp: to_unix(crash_info.time),
            },
            system: CrashInfoSystem {
                os_build: crash_info.system_info.os_build,
                os_version: crash_info.system_info.os_version,
                cpu_ident: crash_info.system_info.cpu_info,
                cpu_microcode: crash_info.system_info.cpu_microcode_version.unwrap_or(u64::MIN),
                cpu_count: crash_info.system_info.cpu_count as u64,
            },
            modules: crash_info.modules.iter().map(|module| CrashInfoModule {
                name: module.name.clone(),
                image_base: module.raw.base_of_image,
                image_size: module.raw.size_of_image,
            }).collect(),
            exception: crash_info.exception_info.map(|exception| CrashInfoException {
                reason: exception.reason.to_string(),
                address: exception.address.0,
            }),
            threads: crash_info.threads.iter().map(|callstack| CrashInfoThread {
                id: callstack.thread_id,
                name: callstack.thread_name.clone(),
                dbg_info: format!("{:?}", callstack.info),
                frames: callstack.frames.iter()
                    .map(|frame| CrashInfoThreadFrame {
                        instruction: frame.instruction,
                        resume_address: frame.resume_address,
                        module_name: frame.module.clone()
                            .map(|module| module.name),
                        trust: frame.trust.as_str().into(),
                        resolved_rva: frame.module.as_ref()
                            .map(|module| resolve_rva(module, frame.resume_address))
                            .flatten(),
                        resolved_disasm: None,
                        resolved_disasm_sel: 0,
                    })
                    .filter(|frame| {
                        if let Some(rva) = frame.resolved_rva {
                            // The main module must only contain frames within .text section.
                            rva <= text_section.virtual_size as u64
                        } else {
                            // Other modules are not filtered.
                            true
                        }
                    })
                    .collect(),
            }).collect(),
            thread_id: crash_info.requesting_thread.map(|id| id as u64),
            executable: ExeInfo {
                name: exe_info.name.map(|s| s.to_string()),
                is_64bit: exe_info.is_64,
                entry_point: exe_info.entry as u64,
                image_base: exe_info.image_base as u64,
                exports: exe_info.exports.iter().map(|export| ExeInfoExport {
                    name: export.name.map(|s| s.to_string()),
                    offset: export.offset.map(|n| n as u64),
                    rva: export.rva as u64,
                    size: export.size as u64,
                }).collect(),
                imports: exe_info.imports.iter().map(|import| ExeInfoImport {
                    name: import.name.to_string(),
                    dll_name: import.dll.to_string(),
                    ordinal: import.ordinal,
                    offset: import.offset as u64,
                    rva: import.rva as u64,
                    size: import.size as u64,
                }).collect(),
                sections: exe_info.sections.iter().map(|section| ExeInfoSection {
                    name: section.name().map(|s| s.to_string()).unwrap_or_default(),
                    size: section.virtual_size as u64,
                    offset: section.virtual_address as u64,
                    ptr_raw: section.pointer_to_raw_data as u64,
                }).collect(),
            },
        };

        // Now that the digest is built, enrich it with disassembly.
        let first_thread_rec = digest.threads.first_mut().unwrap();
        for frame_rec in first_thread_rec.frames.iter_mut() {
            if let Some(rva) = frame_rec.resolved_rva {
                const PRE_OFFSET: usize = 16;
                const POST_OFFSET: usize = 20;

                let pre_bound = (rva as usize - exe_to_rva_offset).saturating_sub(PRE_OFFSET);
                let post_bound = (rva as usize - exe_to_rva_offset).saturating_add(POST_OFFSET);

                let around_slice = exe_slice.get(pre_bound .. post_bound)
                    .expect("failed to get surrounding binary slice for frame");

                // {
                //     let mut debug_string = String::new();
                //     debug_string.reserve(around_slice.len() * 3);
                //     for byte in around_slice {
                //         write!(&mut debug_string, "{:02X} ",byte).unwrap();
                //     }
                //     frame_rec.resolved_disasm = Some(vec![debug_string])
                // }

                let mut disassember = Disassembler::new(
                    around_slice, PRE_OFFSET, exe_info.is_64,
                );

                let rip = frame_rec.resume_address - PRE_OFFSET as u64;
                frame_rec.resolved_disasm = disassember.format_valid(rip);
                frame_rec.resolved_disasm_sel = PRE_OFFSET;
            }
        }

        digest
    }
}
