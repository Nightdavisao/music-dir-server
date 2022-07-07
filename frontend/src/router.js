import 'whatwg-fetch'

const imagesRgx = /\.(png|jpg|gif|jpeg)$/i

export class Router {
    constructor(tBody, imagesContainer, player) {
        this.tBody = tBody
        this.imagesContainer = imagesContainer
        this.path = window.location.pathname
        this.domParser = new DOMParser()
        this.player = player

        window.addEventListener('popstate', async () => {
            await this.fetchPath(window.location.href)
        })
        this.player.nowPlayingText.addEventListener('click', (e) => {
            e.preventDefault()
            this.navigateTo(this.player.getCurrentTrack().location)
        })
    }

    sendHistoryState(title = document.title) {
        window.history.pushState({}, title, this.path)
    }

    setPath(path) {
        this.path = path
        const title = `Index of ${decodeURIComponent(new URL(path).pathname)}`
        document.title = title
    }

    grabImages(html) {
        const images = []
        const parsedHtml = this.domParser.parseFromString(html, "text/html")
        const elements = parsedHtml.getElementsByClassName("fileitem")
        for (let i = 0; i < elements.length; i++) {
            const item = elements[i]
            if (item.href.match(imagesRgx)) {
                const divElement = document.createElement("div")
                const image = document.createElement("img")
                divElement.appendChild(image)
                image.src = item.href
                image.classList.add("image")
                images.push(divElement)
            }
        }
        return images
    }

    async fetchPage(location) {
        try {
            const res = await fetch(location, {
                headers: {
                    "X-PJAX": "true"
                }
            })
            const path = res.headers.get("X-PJAX-URL")
            const html = await res.text()
            return {
                path,
                html,
                images: this.grabImages(html)
            }
        } catch (e) {
            console.error("Failed to fetch page", e)
        }
    }

    setTableContent(html) {
        this.tBody.innerHTML = html
        const elements = document.getElementsByClassName("fileitem")
        if (this.player.trackListing.length > 0) {
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                const currentTrack = this.player.getCurrentTrack()
                if (currentTrack.location === this.path) {
                    if (element.href === currentTrack.track) {
                        element.setAttribute("id", "current-track")
                    }
                }
            }
        }
    }

    setNewImages(elements = []) {
        this.imagesContainer.innerHTML = ""
        for (let i = 0; i < elements.length; i++) {
            const item = elements[i]
            this.imagesContainer.appendChild(item)
        }
    }

    async fetchPath(location) {
        const fetchedPage = await this.fetchPage(location)
        console.log(fetchedPage)
        this.setPath(location)
        this.setTableContent(fetchedPage.html)
        this.setNewImages(fetchedPage.images)
    }

    async navigateTo(location) {
        try {
            await this.fetchPath(location)
            this.sendHistoryState()
        } catch (e) {
            console.error(e)
            alert(e)
        }
    }
}