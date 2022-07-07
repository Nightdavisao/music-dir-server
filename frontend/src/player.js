const isMediaSessionEnabled = 'mediaSession' in navigator
const rgx = /\.(mp3|ogg|wav|flac|m4a)$/i

export class Player {
    constructor(tbody) {
        this.anchorListing = tbody
        this.currentTrack = 0
        this.trackListing = []
        this.audio = new Audio()
        this._addEventListeners()
        this._listenForMediaKeys()

        this.nowPlayingText = null
    }

    getCurrentTrack() {
        return this.trackListing[this.currentTrack]
    }

    _addEventListeners() {
        this.audio.addEventListener('play', () => {
            if (isMediaSessionEnabled) navigator.mediaSession.playbackState = "playing"
            const src = this.audio.src
            this.setMetadata(decodeURIComponent(src.substring(src.lastIndexOf("/") + 1, src.length)))
        })
        this.audio.addEventListener('pause', () => {
            if (isMediaSessionEnabled) navigator.mediaSession.playbackState = "paused"
        })
        this.audio.addEventListener('ended', () => this.playNextTrack())
        this.audio.addEventListener('canplay', () => this.playTrack())
    }

    addItemsFromCurrentList() {
        const elements = document.getElementsByClassName("fileitem")
        for (let i = 0; i < elements.length; i++) {
            const item = elements[i]
            if (item.href.match(rgx)) {
                if (this.trackListing.indexOf(item.href) === -1) {
                    this.trackListing.push({
                        track: item.href,
                        location: window.location.href
                    })
                }
            }
        }
    }

    clearPlaylist() {
        this.trackListing = []
        this.audio.src = ""
    }

    _listenForMediaKeys() {
        if (isMediaSessionEnabled) {
            navigator.mediaSession.setActionHandler('nexttrack', () => this.playNextTrack())
            navigator.mediaSession.setActionHandler('previoustrack', () => this.playPreviousTrack())
        }
    }

    updateTableCurr() {
        const elements = document.getElementsByClassName("fileitem")
        for (let i = 0; i < elements.length; i++) {
            const item = elements[i]
            if (item.href === this.audio.src) {
                item.setAttribute("id", "current-track")
            } else if (item.id === "current-track") {
                item.removeAttribute("id")
            }
        }
    }

    async setMetadata(title = null) {
        if (isMediaSessionEnabled) {
            navigator.mediaSession.metadata = new MediaMetadata({ title })
        }
        if (this.nowPlayingText) {
            if (title) {
                this.nowPlayingText.innerText = "Now playing: " + title
                this.nowPlayingText.href = this.getCurrentTrack().location
            } else {
                this.nowPlayingText.innerText = ""
            }
        }
    }

    playTrack() {
        this.audio.play()
    }

    playPreviousTrack() {
        if (this.currentTrack > 0) {
            this.setCurrentTrack(this.currentTrack - 1)
        } else {
            this.audio.currentTime = 0
        }
    }

    playNextTrack(force = false) {
        if (this.currentTrack + 1 >= this.trackListing.length) {
            if (force) this.setCurrentTrack(0)
        } else {
            this.setCurrentTrack(this.currentTrack + 1)
        }
    }

    setCurrentTrack(index) {
        this.audio.src = this.trackListing[index].track
        this.currentTrack = index
        this.updateTableCurr()
    }

    attachPlayer(floating) {
        // Append buttons for player
        const previousButton = document.createElement("button")
        previousButton.innerText = "Previous"
        const nextButton = document.createElement("button")
        nextButton.innerText = "Next"
        const buttonsDiv = document.createElement("div")
        buttonsDiv.style.cssText = "display: flex; gap: 5px;"
        buttonsDiv.appendChild(previousButton)
        buttonsDiv.appendChild(nextButton)
        const nowPlayingElement = document.createElement("a")
        buttonsDiv.appendChild(nowPlayingElement)
        this.nowPlayingText = nowPlayingElement
        floating.appendChild(buttonsDiv)

        // Append player to floating
        this.audio.setAttribute("controls", "controls")
        this.audio.id = "player"
        floating.appendChild(this.audio)

        nextButton.addEventListener("click", () => this.playNextTrack(true))
        previousButton.addEventListener("click", () => this.playPreviousTrack())
    }
}