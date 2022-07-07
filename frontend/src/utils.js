function isDirectory(string) {
    return string.lastIndexOf("/") + 1 === string.length || string.indexOf(".") === -1
}

export {
    isDirectory
}