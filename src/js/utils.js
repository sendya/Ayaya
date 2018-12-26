export const Fullscreen = {
    isFullscreen: () => {
        return !!(
            document.webkitFullscreenElement ||
            document.webkitIsFullScreen ||
            document.mozFullScreen ||
            document.msFullscreenElement
        )
    },
    requestFullscreen: (el) => {
        if (el.requestFullscreen)
            el.requestFullscreen()
        else if (el.webkitRequestFullScreen)
            el.webkitRequestFullScreen()
        else if (el.mozRequestFullScreen)
            el.mozRequestFullScreen()
        else if (el.msRequestFullscreen)
            el.msRequestFullscreen()
        else if (el.querySelector && el.querySelector('mplayer-video') && el.querySelector('mplayer-video').webkitEnterFullScreen)
            el.querySelector('mplayer-video').webkitEnterFullScreen()
        else if (el.webkitEnterFullScreen)
            el.webkitEnterFullScreen()
    },
    cancelFullscreen: (el = document) => {
        if (el.exitFullscreen)
            el.exitFullscreen()
        else if (el.webkitCancelFullScreen)
            el.webkitCancelFullScreen()
        else if (el.webkitExitFullscreen)
            el.webkitExitFullscreen()
        else if (el.mozCancelFullScreen)
            el.mozCancelFullScreen()
        else if (el.msExitFullscreen)
            el.msExitFullscreen()
    },
    fullscreenEnabled: () => {
        return !!(
            document.fullscreenEnabled ||
            document.webkitFullscreenEnabled ||
            document.mozFullScreenEnabled ||
            document.msFullscreenEnabled
        )
    }
}

export const requestAnimationFrame = (window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    function (fn) {
        window.setTimeout(fn, 1000 / 60)
    }).bind(window)

export const cancelAnimationFrame = (window.cancelAnimationFrame ||
    window.mozCancelAnimationFrame ||
    window.webkitCancelAnimationFrame ||
    window.clearTimeout).bind(window)

const _idsCounter = {}

export function uniqueId(prefix) {
    _idsCounter[prefix] || (_idsCounter[prefix] = 0)
    const id = ++_idsCounter[prefix]
    return prefix + id
}

export function isNumber(v) {
    return value - parseFloat(value) + 1 >= 0
}

export function isArray(v) {
    if (typeof v === 'object') {
        return Object.prototype.toString.call(v) === '[object Array]'
    }
    return v instanceof Array
}

export function formatTime(time) {
    let min, sec
    min = Math.floor(time / 60)
    if (min < 10) min = '0' + min
    sec = Math.floor(time % 60)
    if (sec < 10) sec = '0' + sec
    if (min === 'Nan' || sec === 'Nan') {
        return '00:00'
    }
    return `${min}:${sec}`
}

export function seekToSecondsText(last, now) {
    let seconds = 0
    if (last < now) {
        seconds = parseInt( now - last )
        return `快进 ${seconds} 秒`
    } else {
        seconds = parseInt( last - now )
        return `快退 ${seconds} 秒`
    }
}

export function now() {
    if (window.performance && window.performance .now)
        return performance.now()
    return Date.now()
}

export default { Fullscreen, requestAnimationFrame, cancelAnimationFrame, formatTime, uniqueId, isNumber, seekToSecondsText, now}