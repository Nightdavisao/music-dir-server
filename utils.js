const { spawn } = require('child_process')
const { statSync } = require('fs')

function getDirectorySize(path) {
    /*return new Promise((resolve, reject) => {
        const listener = spawn("du", ["-sh", "-b", path, "| cut -f1"])
        listener.stdout.on("data", data => {
            resolve(parseInt(data.toString().trim()))
        })
        listener.on("error", err => reject(err))
    })*/
    return Promise.resolve(1000)
}

async function getPathSize(path) {
    const stats = statSync(path)
    if (stats.isFile()) {
        return stats.size
    }
    if (stats.isDirectory) {
        return getDirectorySize(path)
    }
    throw new Error("Unknown type of path")
}

module.exports = {
    getDirectorySize,
    getPathSize
}