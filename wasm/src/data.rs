use std::time::{UNIX_EPOCH, SystemTime};

use minidump_processor::ProcessState;
use serde::Serialize;


#[derive(Clone, Debug, Serialize)]
pub struct CrashInfoMetadata {
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
}

#[derive(Clone, Debug, Serialize)]
pub struct CrashInfo {
    pub metadata: CrashInfoMetadata,
    pub system: CrashInfoSystem,
    pub modules: Vec<CrashInfoModule>,
    pub exception: Option<CrashInfoException>,
    pub threads: Vec<CrashInfoThread>,
    pub thread_id: Option<u64>,
}

impl CrashInfo {
    pub fn new(process: ProcessState) -> Self {
        let to_unix = |timestamp: SystemTime| -> u64 {
            timestamp.duration_since(UNIX_EPOCH)
                .map(|duration| duration.as_millis() as u64)
                .unwrap_or(u64::MIN)
        };

        Self {
            metadata: CrashInfoMetadata {
                process_id: process.process_id,
                process_timestamp: process.process_create_time.map(to_unix),
                dump_timestamp: to_unix(process.time),
            },
            system: CrashInfoSystem {
                os_build: process.system_info.os_build,
                os_version: process.system_info.os_version,
                cpu_ident: process.system_info.cpu_info,
                cpu_microcode: process.system_info.cpu_microcode_version.unwrap_or(u64::MIN),
                cpu_count: process.system_info.cpu_count as u64,
            },
            modules: process.modules.iter().map(|module| CrashInfoModule {
                name: module.name.clone(),
                image_base: module.raw.base_of_image,
                image_size: module.raw.size_of_image,
            }).collect(),
            exception: process.exception_info.map(|exception| CrashInfoException {
                reason: exception.reason.to_string(),
                address: exception.address.0,
            }),
            threads: process.threads.iter().map(|callstack| CrashInfoThread {
                id: callstack.thread_id,
                name: callstack.thread_name.clone(),
                dbg_info: format!("{:?}", callstack.info),
                frames: callstack.frames.iter().map(|frame| CrashInfoThreadFrame {
                    instruction: frame.instruction,
                    resume_address: frame.resume_address,
                    module_name: frame.module.clone()
                        .map(|module| module.name),
                    trust: frame.trust.as_str().into(),
                }).collect(),
            }).collect(),
            thread_id: process.requesting_thread.map(|id| id as u64),
        }
    }
}
