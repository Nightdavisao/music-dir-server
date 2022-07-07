const { spawn } = require("child_process")

/**
 * 
 * @param {string} path 
 * @param {NodeJS.WritableStream} dest 
 */
function zipDirectory(rootPath, dest) {
    console.log("Zip dir")
    const subprocess = spawn("zip", ["-0", "-r", "-", "."], {cwd: rootPath})

    subprocess.stdout.on("data", data => {
        dest.write(data)
    })
    subprocess.stdout.on("end", () => dest.end())
}

module.exports = {
    zipDirectory
}