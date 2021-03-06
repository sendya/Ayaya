import { formatTime, requestAnimationFrame, cancelAnimationFrame } from './utils'
import Logger from './logger'
import Icons from './icons'
import PLAY_STATUS from './player-status'
import { EVENTS } from './events'

const logger = Logger.getLogger()

class Controller {
  constructor (player) {
    this.player = player
    this.element = player.element
    this.video = player.video

    this.autoHideControls = 0

    this.status = PLAY_STATUS.LOADING
    this.speed = 1
    this.isShow = false
    this.isLight = false
    this.mirror = false
    this.hotkey = false

    this.events = []

    this.initButton()
    this.initLoadBar()
    this.initPlayTimer()
    this.initVolumeBar()
    this.initSettingGroup()
    this.initWaitingWarp()
    this._maskClick()

    this.eventFunc = () => {
      for (let i = 0; i < this.events.length; i++) {
        this.events[i]()
      }
    }

    this.element.addEventListener('mousemove', () => {
      this.autoHide()
    })

    this.lightElement = this.element.getElementsByClassName('close-light')[0]

    logger.debug('Controller inited')
  }

  initButton () {
    this.button = {}
    this.button.play = this.element.querySelector('.button-play')
    this.button.volume = this.element.querySelector('.button-volume')
    this.button.setting = this.element.querySelector('.button-settings-checkbox')
    this.button.nextPlay = this.element.querySelector('.button-next')

    const ended = () => {
      this.player.pause()
      this.status = PLAY_STATUS.PAUSE
      this.video.removeEventListener('timeupdate', this.eventFunc)
      this.video.removeEventListener('ended', ended)

      this.player.event.dispatch(EVENTS.ENDED)
    }

    this.play = () => {
      logger.debug(`Play Status: ${this.status}`)
      if (this.status === PLAY_STATUS.PLAY) {
        this.player.pause()
      } else {
        this.player.play()
      }
    }

    this.listener = () => {
      this.video.addEventListener('timeupdate', this.eventFunc)
      this.video.addEventListener('ended', ended)
      this.status = PLAY_STATUS.PLAY
      this.player.showStats(PLAY_STATUS.PLAY)
      this.button.play.innerHTML = Icons.pause
      this.autoHide()
    }

    this.removeListener = () => {
      this.video.removeEventListener('timeupdate', this.eventFunc)
      this.video.removeEventListener('ended', ended)
      this.status = PLAY_STATUS.PAUSE
      this.player.showStats(PLAY_STATUS.PAUSE)
      this.button.play.innerHTML = Icons.play
    }

    this.next = () => {
      logger.debug(`Next video: ${this.player.source2}`)
      if (this.player.source2 !== null) {
        this.player.next()
      }
    }

    this.button.nextPlay.addEventListener('click', () => this.next())
    this.button.play.addEventListener('click', () => this.play())
    this.button.volume.addEventListener('click', () => {
      if (this.video.muted) {
        this.setVolume(this.video.volume * 100)
      } else {
        this.setVolume(0)
      }
    })
  }

  initLoadBar () {
    this.bar = {}
    this.bar.load = this.element.querySelector('.control-bar') // .load-bar
    this.bar.loaded = this.bar.load.querySelector('.load-bar .loaded')
    this.bar.played = this.bar.load.querySelector('.load-bar .played')
    this.bar.hover = this.bar.load.querySelector('.hover')
    this.bar.timerLabel = this.bar.load.querySelector('.seek-timer-label')

    const stopDrag = (e) => {
      this.element.removeEventListener('mousemove', proceedDrag)
      this.element.removeEventListener('mouseup', stopDrag)
    }

    const startDrag = (e) => {
      this.element.addEventListener('mousemove', proceedDrag)
      this.element.addEventListener('mouseup', stopDrag)
      e.preventDefault()
      // e.stopPropagation();
      return false
    }

    const proceedDrag = (e) => {
      if (!this.video.duration || this.video.duration <= 0) return

      let percentage = (e.clientX - this.bar.load.getBoundingClientRect().left) / this.bar.load.offsetWidth
      percentage = percentage > 0 ? percentage : 0
      percentage = percentage < 1 ? percentage : 1
      this.bar.played.style.width = `${(percentage * 100).toFixed(2)}%`
      this.player.seek(percentage * this.video.duration)
    }

    this.bar.played.addEventListener('mousedown', startDrag)
    this.bar.load.addEventListener('mousedown', (e) => {
      let offsetX = e.offsetX
      let target = e.target
      while (target !== this.bar.load) {
        offsetX += target.offsetLeft
        target = target.parentNode
      }
      let value = offsetX / this.bar.load.offsetWidth
      value = value > 0 ? value : 0
      value = value < 1 ? value : 1
      this.bar.played.style.width = `${(value * 100).toFixed(2)}%`
      this.player.seek(parseFloat(value) * this.video.duration)
      e.preventDefault()
      // e.stopPropagation()
      return false
    })
    this.bar.load.addEventListener('mousemove', (e) => {
      if (!this.video.duration || this.video.duration <= 0) return
      let percentage = (e.clientX - this.bar.load.getBoundingClientRect().left) / this.bar.load.offsetWidth
      percentage = percentage > 0 ? percentage : 0
      percentage = percentage < 1 ? percentage : 1
      let timer = formatTime(parseFloat(percentage) * this.video.duration)

      this.bar.timerLabel.style.left = `${(percentage * 100)}%`
      this.bar.timerLabel.innerText = timer
      this.bar.hover.style.width = `${(percentage * 100)}%`
    })

    this.updateLoadBar = () => {
      let percent = this.video.currentTime / this.video.duration
      let percentage = this.video.buffered.length ? this.video.buffered.end(this.video.buffered.length - 1) / this.video.duration : 0
      let playedWidth = (percent * 100).toFixed(2) + '%'
      let percentageWidth = (percentage * 100).toFixed(2) + '%'

      this.bar.loaded.style.width = percentageWidth
      this.bar.played.style.width = playedWidth
    }
    /*

        this.hlsStats = () => {
            logger.debug(this.player.stats)
            this.player.infoPanel.trigger()
        };
*/

    // this.events.push(this.hlsStats)
    this.events.push(this.updateLoadBar)
  }

  initVolumeBar () {
    this.volumeBar = {}
    this.volumeBar.bar = this.element.querySelector('.volume-bar')
    this.volumeBar.inner = this.element.querySelector('.volume-bar-inner')
    this.volumeBar.min = this.volumeBar.bar.offsetLeft
    this.volumeBar.max = this.volumeBar.min + this.volumeBar.offsetWidth

    this.setVolume = (val) => {
      val = val > 100 ? 100 : val
      val = val < 0 ? 0 : val

      val = parseInt(val)

      logger.debug('Volume change to ' + val)

      if (parseInt(val) === 0) {
        this.video.muted = true
        this.button.volume.innerHTML = Icons.mute
        this.volumeBar.inner.style.width = '0%'
      } else {
        this.video.muted = false
        this.video.volume = (val / 100).toFixed(2)

        this.volumeBar.inner.style.width = `${val}%`

        if (val > 0 && val < 50) {
          this.button.volume.innerHTML = Icons.volume1
        } else {
          this.button.volume.innerHTML = Icons.volume2
        }
      }
      this.player.volume = val
      this.player.notice.showAutoHide(`音量 ${val}`)
      this.player.infoPanel.setVolumeText(val)
    }

    this.getVolume = () => {
      return this.video.volume
    }

    const handler = (event) => {
      let progressBarLeft = this.volumeBar.bar.getBoundingClientRect().left
      let val = ((event.clientX - progressBarLeft) / this.volumeBar.bar.offsetWidth) * 100
      // val = val > 100 ? 100 : val
      // val = val < 0 ? 0 : val

      this.setVolume(val)
    }

    const startDragAndDrop = (event) => {
      handler(event)
      this.element.addEventListener('mousemove', proceedDragAndDrop)
      this.element.addEventListener('mouseup', stopDragAndDrop)
      event.preventDefault()
      event.stopPropagation()
      return false
    }

    const proceedDragAndDrop = (event) => {
      handler(event)
    }

    const stopDragAndDrop = (event) => {
      this.element.removeEventListener('mousemove', proceedDragAndDrop)
      this.element.removeEventListener('mouseup', stopDragAndDrop)
    }

    this.volumeBar.inner.addEventListener('mousedown', startDragAndDrop)
    this.volumeBar.bar.addEventListener('mousedown', (e) => {
      handler(e)
    })
  }

  initPlayTimer () {
    this.timer = {}
    this.timer.current = this.element.querySelector('.play-time .play-current')
    this.timer.duration = this.element.querySelector('.play-time .play-duration')

    // this.timer.duration.innerText = formatTime(this.video.duration)

    this.updateTimer = () => {
      this.timer.current.innerText = formatTime(this.video.currentTime)
      this.timer.duration.innerText = formatTime(this.video.duration)
    }
    this.events.push(this.updateTimer)
  }

  initSettingGroup () {
    const _this = this
    this.settings = {}
    let settingGroup = this.element.querySelector('.setting-group')
    this.playSpeedBox = this.element.querySelector('.play-speed-box')
    this.settings.playSpeed = settingGroup.querySelector('.play-speed')
    this.settings.playSpeedText = settingGroup.querySelector('.play-speed .text')
    this.settings.mirror = settingGroup.querySelector('.mirror')
    this.settings.hotkey = settingGroup.querySelector('.hotkey')
    this.settings.loop = settingGroup.querySelector('.loop')

    const activeElement = (el) => {
      let li = el.getElementsByTagName('li')
      for (let i = 0; i < li.length; i++) {
        li[i].classList.remove('active')
      }
    }

    this.settings.playSpeed.addEventListener('click', (e) => {
      settingGroup.classList.add('hidden')
      this.playSpeedBox.classList.remove('hidden')
    })

    this.playSpeedBox.addEventListener('click', (event) => {
      let target = event.target || event.srcElement
      if (target.tagName.toLowerCase() === 'li') {
        if (target.dataset.spd != null) {
          this.player.playbackRate(target.dataset.spd)
          activeElement(this.playSpeedBox)
          target.classList.add('active')
        }
      }
      this.playSpeedBox.classList.add('hidden')
      settingGroup.classList.remove('hidden')
    })

    this.settings.mirror.addEventListener('click', _this._mirror.bind(_this), false)

    this.settings.loop.addEventListener('click', _this._loop.bind(_this), false)

    this.bindHotKeyFunc = _this._bindHotKey.bind(_this)

    this.settings.hotkey.addEventListener('click', (e) => {
      _this._hotKey()
    })

    // default on hotkey
    _this._hotKey()
  }

  initWaitingWarp () {
    const { player: { element, video } } = this
    this.waitingId = 0

    const loaded = () => {
      element.classList.remove('player-waiting')
      clearInterval(this.waitingId)
    }

    const loadedFun = () => {
      loaded()
    }

    this.player.video.addEventListener('waiting', () => {
      element.classList.add('player-waiting')
      logger.debug('Video Loading..')

      this.waitingId = setInterval(() => {
        if (video.readyState > 3) {
          loaded()
        }
      }, 300)
    })

    video.addEventListener('canplay', loadedFun)
    // this.player.video.addEventListener('canplaythrough', loaded)
  }

  /**
     * Auto hide controls
     */
  autoHide () {
    let that = this
    this.autoHideFunc = function () {
      that.show()
      clearTimeout(that.autoHideControls)
      that.autoHideControls = setTimeout(() => {
        if (that.video.played.length && that.status !== PLAY_STATUS.PAUSE) {
          that.hide()
        }
      }, 3000)
    }
    requestAnimationFrame(this.autoHideFunc)
  }

  show () {
    this.isShow = true
    this.player.element.classList.remove('player-hide-control')
    document.body.style.cursor = 'auto'
  }

  hide () {
    this.isShow = false
    this.player.element.classList.add('player-hide-control')
    this.button.setting.checked = false
    if (this.player.screen.mode > 0) {
      document.body.style.cursor = 'none'
    }
  }

  _mirror () {
    if (this.mirror) {
      this.video.style.transform = 'scaleX(1)'
      this.settings.mirror.querySelector('.text').innerText = '关'
      this.player.notice.showAutoHide('镜像 关')
    } else {
      this.video.style.transform = 'scaleX(-1)'
      this.settings.mirror.querySelector('.text').innerText = '开'
      this.player.notice.showAutoHide('镜像 开')
    }
    this.mirror = !this.mirror
  }

  _loop () {
    if (this.video.loop) {
      this.video.loop = false
      this.settings.loop.querySelector('.text').innerText = '关闭'
      this.player.notice.showAutoHide('循环播放 关')
    } else {
      this.video.loop = true
      this.settings.loop.querySelector('.text').innerText = '开启'
      this.player.notice.showAutoHide('循环播放 开')
    }
  }

  _light (bool = false) {
    const { event } = this.player
    const text = bool ? '关灯' : '开灯'
    this.lightElement.innerHTML = text
    this.isLight = bool
    event.dispatch(EVENTS.PLAYER_LIGHT, this.isLight)
  }

  _hotKey () {
    const { hotkey, settings, player: { notice } } = this

    if (hotkey) {
      settings.hotkey.querySelector('.text').innerText = '关闭'
      document.removeEventListener('keydown', this.bindHotKeyFunc)
      notice.showAutoHide('全局热键 关')
      logger.debug('Hotkey disable')
    } else {
      settings.hotkey.querySelector('.text').innerText = '开启'
      document.addEventListener('keydown', this.bindHotKeyFunc)
      notice.showAutoHide('全局热键 开')
      logger.debug('Hotkey enable')
    }
    this.hotkey = !hotkey
  }

  _bindHotKey (event) {
    console.log('event', event)
    switch (event.keyCode) {
      case 123:
        event.stopPropagation()
        event.preventDefault()
        console.log('...link start!')
        return false
      case 37: // 键盘左键
      case 74: // J 快退
        event.stopPropagation()
        event.preventDefault()
        this.player.seek(this.player.seek() - 5)
        break
      case 39: // 键盘右键
      case 76: // L 快退
        event.stopPropagation()
        event.preventDefault()
        this.player.seek(this.player.seek() + 5)
        break
      case 38: // 上键
        event.stopPropagation()
        event.preventDefault()
        this.player.setVolume(this.player.volume + 5)
        break
      case 40: // 下键
        event.stopPropagation()
        event.preventDefault()
        this.player.setVolume(this.player.volume - 5)
        break
      case 75: // K 键，空格键
      case 32:
        event.stopPropagation()
        event.preventDefault()
        this.play()
        break
    }
  };

  /**
     * 点击播放器内窗口切换 播放状态
     * @private
     */
  _maskClick () {
    logger.debug('addEventListener video click -> play()')

    const that = this

    this.player.video.addEventListener('click', () => {
      if (!that.player.menu.isShow && that.isShow) {
        this.play()
      }
    })
  }

  resetLoadBar () {
    const { bar: { played } } = this
    played.style.width = `0%`
  }

  destroy () {
    document.removeEventListener('keyup', this.bindHotKeyFunc)
    this.removeListener()
    clearTimeout(this.autoHideControls)
    clearInterval(this.waitingId)
    cancelAnimationFrame(this.autoHideFunc)
  }
}

export default Controller
