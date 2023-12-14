#![allow(dead_code)]
use iced_x86::{Decoder, DecoderOptions, Instruction, FastFormatter};


pub struct Disassembler<'src> {
    decoder: Decoder<'src>,
    src_slice: &'src [u8],
    selected_offset: usize,
}

impl<'src> Disassembler<'src> {
    pub fn new<'source: 'src>(
        src_slice: &'source [u8],
        selected_offset: usize,
        is_x64: bool,
    ) -> Self {
        let decoder = Decoder::new(
            if is_x64 { 64 } else { 32 },
            src_slice,
            DecoderOptions::NONE,
        );
        Self { src_slice, decoder, selected_offset }
    }

    /// Attempt to find offset to the first "valid" instruction.
    ///
    /// "Valid" offset here means such an offset that iteratively decoding
    /// source slice starting from it yields valid instructions up until the
    /// `selected_offset` into the original slice, and the instruction there
    /// can also be decoded as valid.
    ///
    /// This is built purely for the purpose of speculative instruction
    /// search within a binary slice which is likely to begin in the middle
    /// of some instruction.
    pub fn first_valid_offset(&mut self) -> Option<usize> {
        let mut is_offset_valid = |offset: usize| -> bool {
            let mut instruction = Instruction::default();

            self.decoder.set_position(offset).unwrap();
            while self.decoder.position() < self.selected_offset {
                self.decoder.decode_out(&mut instruction);
                if instruction.is_invalid() {
                    return false;
                }
            }

            self.decoder.position() == self.selected_offset
        };

        for offset in 0 .. self.selected_offset {
            if is_offset_valid(offset) {
                return Some(offset)
            }
        }

        None
    }

    /// Format all instructions starting at the first valid offset.
    /// See [`Self::first_valid_offset`] for definition of "valid offset".
    pub fn format_valid(&mut self, rip: u64) -> Option<Vec<(usize, String)>> {
        let valid_offset = self.first_valid_offset()?;

        self.decoder.set_position(valid_offset).unwrap();
        self.decoder.set_ip(rip + valid_offset as u64);

        let mut strings = Vec::new();
        let mut formatter = FastFormatter::new();
        let mut instruction = Instruction::default();

        formatter.options_mut().set_always_show_memory_size(true);
        formatter.options_mut().set_space_after_operand_separator(true);
        formatter.options_mut().set_use_hex_prefix(true);

        while self.decoder.can_decode() {
            let position = self.decoder.position();
            let mut output = String::new();

            self.decoder.decode_out(&mut instruction);
            match instruction.is_invalid() {
                false => formatter.format(&instruction, &mut output),
                true => break,
            }

            strings.push((position, output));
        }

        Some(strings)
    }
}

