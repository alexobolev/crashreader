export function asHex(number) {
    return '0x' + number.toString(16)
}

export function getFilename(path) {
    return path.split('\\').pop().split('/').pop()
}
