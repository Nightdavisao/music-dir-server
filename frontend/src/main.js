import 'core-js/stable';
import 'regenerator-runtime/runtime';
import {
    Router
} from "./router"
import {
    Player
} from './player'

document.addEventListener("DOMContentLoaded", () => {
    const floating = document.getElementById("floating")
    const table = document.getElementById("table")
    const imagesContainer = document.getElementById("images")
    const tbody = table.tBodies[0]
    const rgx = /\.(mp3|ogg|wav|flac|m4a)$/i
    const player = new Player(tbody)
    player.attachPlayer(floating)
    const router = new Router(tbody, imagesContainer, player)

    tbody.addEventListener("click", async (e) => {
        if (e.target.tagName === "A") {
            e.preventDefault()
            if (e.target.classList.contains("directoryitem")) {
                router.navigateTo(e.target.href)
                return
            }

            if (e.target.href.match(rgx)) {
                if (player.trackListing.length > 0) {
                    player.clearPlaylist()
                    player.addItemsFromCurrentList()
                } else {
                    player.addItemsFromCurrentList()
                }
                const index = player.trackListing.map(item => item.track).indexOf(e.target.href)
                if (index !== -1) {
                    player.setCurrentTrack(index)
                    return
                }
            } else {
                window.open(e.target.href)
            }
        }
    })

})