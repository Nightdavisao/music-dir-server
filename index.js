const {
    createReadStream,
    statSync,
    readFileSync,
    readdirSync,
    existsSync
} = require('fs')
const http = require('http')
const {
    normalize,
    join,
    parse
} = require('path')
require('dotenv').config()
const ejs = require('ejs')
const {
    getPathSize,
    getDirectorySize
} = require('./utils')
const mime = require('mime-types')
const {
    zipDirectory
} = require('./zipUtil')
const {
    pipeline
} = require('stream')

const dirIndex = process.env.SERVE_DIR

/**
 * Reply with "not found" to client
 * @param {http.ServerResponse} res 
 */
function replyWithNotFound(res) {
    res.writeHead(404)
    res.write("404 Not Found")
    res.end()
}

/**
 * 
 * @param {ReadableStream} stream 
 * @param {http.ServerResponse} res 
 */
function serveFromStream(stream, res) {
    stream.on('data', data => {
        if (res.writable) {
            res.write(data)
        } else {
            console.log("Premature close. Closing file read stream")
            stream.close()
            res.end()
        }
    })
    stream.on('error', err => console.error("Error on serving", err))
    stream.on('end', () => res.end())
}

/**
 * @param {string} path
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 */
function serveWithRange(path, req, res) {
    // TODO: handle cache correctly
    const mimetype = mime.contentType(parse(path).base)
    const {
        size, mtimeMs
    } = statSync(path)
    const fileHash = `"${size}-${Math.round(mtimeMs)}"`
    if (req.method === "HEAD") {
        res.setHeader("Accept-Ranges", "bytes")
        res.setHeader("Content-Type", mimetype)
        res.setHeader("Content-Length", size)
        res.setHeader("Last-Modified", fileHash)
        res.setHeader("Cache-Control", "private, max-age=60000")
        res.setHeader("ETag", fileHash)
        res.writeHead(204)
        return res.end()
    }
    if (req.method === "GET") {
        if (req.headers.range) {
            const rangeRequested = req.headers["range"].replace("bytes=", "")
            const split = rangeRequested.split("-")
            const rawStart = parseInt(split[0])
            const rawEnd = parseInt(split[1])
            const start = !isNaN(rawStart) ? rawStart : 0
            const end = !isNaN(rawEnd) ? rawEnd : size - 1
            console.log("start:", start)
            console.log("end", end)

            if (start >= size || end >= size) {
                res.writeHead(416, {
                    "Content-Range": `bytes */${size}`
                })
                return res.end()
            }

            res.writeHead(206, {
                "Accept-Ranges": "bytes",
                "Content-Type": mimetype,
                "Content-Range": `bytes ${start}-${end}/${size}`,
                "Content-Length": end - start + 1,
                "Cache-Control": "private, max-age=60000",
                // Seems like etag can be anything.
                "ETag": fileHash,
                "Last-Modified": fileHash
            })

            const stream = createReadStream(path, {
                start,
                end
            })

            serveFromStream(stream, res)
        } else {
            const stream = createReadStream(path)
            res.setHeader("Accept-Ranges", "bytes")
            res.setHeader("Content-Type", mimetype)
            res.setHeader("Content-Length", size)

            serveFromStream(stream, res)
        }
    }
}

/**
 * 
 * @param {string} rootPath 
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 */
function serveStatic(rootPath, req, res) {
    if (res.writable) {
        const decodedPath = decodeURIComponent(req.url)
        const split = decodedPath.split("/").filter(item => item !== '')

        if (split[0] === "static") {
            split.shift()
            const normalized = normalize(rootPath + "/" + split.join("/"))
            console.log("Requesting from static dir:", normalized)
            if (existsSync(normalized)) {
                const stat = statSync(normalized)
                if (stat.isFile()) {
                    console.log("Serving with range")
                    serveWithRange(normalized, req, res)
                    return true
                }
            }
        }
    }
    return false
}

http.createServer(async (req, res) => {
    try {
        
        const reqUrl = req.url ? req.url : "/"
        // Serve favicon
        if (reqUrl === "/favicon.ico") {
            console.log("Requested favicon")
            serveWithRange("./static/favicon.ico", req, res)
        } else {
            // Try to serve static files first.
            const servedWithStatic = serveStatic(process.env.STATIC_DIR, req, res)
    
            // Serve directory from env variable "SERVE_DIR" if not served with static
            if (!servedWithStatic) {
                if (!res.writable) {
                    return
                }
                const decodedPath = decodeURIComponent(reqUrl)
                const path = normalize(dirIndex + decodedPath)
                console.log("requested path:", path)
                if (existsSync(path)) {
                    const pathStatus = statSync(path)
    
                    if (pathStatus.isDirectory()) {
                        const dirList = readdirSync(path)
    
                        const listing = await Promise.all(dirList.map(async item => {
                            const joinedPath = join(path, item)
                            const entryStat = statSync(joinedPath)
                            return {
                                type: entryStat.isFile() ? "file" : "directory",
                                name: item,
                                path: join(decodedPath, item),
                                size: await getPathSize(joinedPath)
                            }
                        }))
    
                        const directoryListing = {
                            index: normalize(decodedPath),
                            listing: [].concat([
                                decodedPath !== "/" ? {
                                    type: "directory",
                                    name: "..",
                                    path: join(decodedPath, "..")
                                } : null,
                                ...listing
                            ]).filter(item => item)
                        }
    
                        console.log(req.headers)
    
                        let renderedTemplate
                        if (!req.headers["x-pjax"]) {
                            renderedTemplate = await ejs.renderFile("views/view.ejs", directoryListing)
                        } else {
                            renderedTemplate = await ejs.renderFile("views/directory_fragment.ejs", directoryListing)
                            res.setHeader("X-PJAX-URL", reqUrl)
                        }
                        res.setHeader("Content-Length", Buffer.byteLength(renderedTemplate))
                        res.setHeader("Content-Type", "text/html")
                        res.writeHead(200)
                        res.write(renderedTemplate)
                        res.end()
                    } else if (pathStatus.isFile()) {
                        serveWithRange(path, req, res)
                    } else {
                        replyWithNotFound(res)
                    }
                } else {
                    console.log("Path doesn't exist")
                    replyWithNotFound(res)
                }
            }
        }
    } catch (err) {
        console.error("Error", err)
        res.writeHead(500)
        res.write("Server-side error")
    }
}).listen(4000, "0.0.0.0")

console.log("Listening")