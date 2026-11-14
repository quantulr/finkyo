package main

import (
	"bytes"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/audio"
	_ "github.com/egoist/mygo/audio/aac"
	_ "github.com/egoist/mygo/audio/flac"
	_ "github.com/egoist/mygo/audio/mp3"
	_ "github.com/egoist/mygo/audio/mp4"
	_ "github.com/egoist/mygo/audio/vorbis"
	"github.com/egoist/mygo/ui"
	"github.com/egoist/mygo/ui/video"
)

type mediaItem struct {
	entry Entry
	path  string
}

type playerState struct {
	path       string
	directory  string
	kind       string
	video      *ui.VideoPlayer
	audio      *audio.Player
	audioOff   func()
	loading    bool
	err        string
	volume     float64
	muted      bool
	rate       float64
	loop       bool
	handledEnd bool
	audioEnded bool
	playlist   []mediaItem
}

func (p *playerState) close() {
	if p.audioOff != nil {
		p.audioOff()
		p.audioOff = nil
	}
	if p.video != nil {
		p.video.Close()
		p.video = nil
	}
	if p.audio != nil {
		p.audio.Close()
		p.audio = nil
	}
	p.path = ""
	p.directory = ""
	p.kind = ""
	p.loading = false
	p.err = ""
	p.handledEnd = false
	p.audioEnded = false
	p.playlist = nil
}

func (p *playerState) playing() bool {
	if p.video != nil {
		return p.video.Playing()
	}
	if p.audio != nil {
		return p.audio.Playing()
	}
	return false
}

func (p *playerState) position() time.Duration {
	if p.video != nil {
		return p.video.Position()
	}
	if p.audio != nil {
		return p.audio.Position()
	}
	return 0
}

func (p *playerState) duration() time.Duration {
	if p.video != nil {
		return p.video.Duration()
	}
	if p.audio != nil {
		return p.audio.Duration()
	}
	return 0
}

func (p *playerState) seek(position time.Duration) {
	if p.video != nil {
		p.video.Seek(position)
	}
	if p.audio != nil {
		p.audio.Seek(position)
	}
}

func (p *playerState) toggle() {
	if p.video != nil {
		if p.video.Playing() {
			p.video.Pause()
		} else {
			p.video.Play()
		}
		return
	}
	if p.audio != nil {
		if p.audio.Playing() {
			p.audio.Pause()
		} else {
			p.audio.Play()
		}
	}
}

func (p *playerState) setVolume(volume float64) {
	p.volume = math.Min(1, math.Max(0, volume))
	p.muted = p.volume == 0
	if p.video != nil {
		p.video.SetVolume(p.volume).SetMuted(p.muted)
	}
	if p.audio != nil {
		p.audio.SetVolume(p.volume)
	}
}

func (p *playerState) toggleMute() {
	p.muted = !p.muted
	if p.video != nil {
		p.video.SetMuted(p.muted)
	}
	if p.audio != nil {
		if p.muted {
			p.audio.SetVolume(0)
		} else {
			p.audio.SetVolume(p.volume)
		}
	}
}

func (p *playerState) setRate(rate float64) {
	p.rate = rate
	if p.video != nil {
		p.video.SetRate(rate)
	}
	if p.audio != nil {
		p.audio.SetSpeed(rate)
	}
}

func (p *playerState) cycleRate() {
	rates := []float64{1, 1.25, 1.5, 2, 0.75}
	current := 0
	for i, rate := range rates {
		if math.Abs(rate-p.rate) < 0.001 {
			current = i
			break
		}
	}
	p.setRate(rates[(current+1)%len(rates)])
}

func (p *playerState) setLoop(loop bool) {
	p.loop = loop
	if p.video != nil {
		p.video.SetLoop(loop)
	}
	if p.audio != nil {
		p.audio.SetLoop(loop)
	}
}

func (p *playerState) indexOf(path string) int {
	for i, item := range p.playlist {
		if item.path == path {
			return i
		}
	}
	return -1
}

func (a *app) playerView(c *ui.Context, p string) {
	p = strings.Trim(p, "/")
	a.ensurePlayer(p)
	state := &a.player

	if state.video != nil {
		if err := state.video.Err(); err != nil && state.err == "" {
			state.err = err.Error()
		}
		if state.video.Ended() && !state.loop && !state.handledEnd {
			state.handledEnd = true
			a.playNextAfterEnd()
		}
	}
	if state.audioEnded {
		state.audioEnded = false
		if !state.handledEnd {
			state.handledEnd = true
			a.playNextAfterEnd()
		}
	}
	if state.playing() {
		c.After(250 * time.Millisecond)
	}

	theme := c.Theme()
	ui.Column(c).Fill().Children(func() {
		ui.Row(c).Padding(10).Gap(8).AlignItems(ui.Center).Children(func() {
			back := iconButton(c, iconArrowLeft, "返回", "返回目录", false)
			if back.Clicked() {
				a.router.Push(browseRoute(state.directory))
			}

			ui.Column(c).Grow(1).Children(func() {
				ui.Text(c, baseName(p)).SingleLine()
				ui.Text(c, mediaKindLabel(state.kind)).
					FontSize(11).
					TextColor(theme.TextMuted)
			})

			external := iconButton(c, iconExternal, "原文件", "在新标签页打开原文件", false)
			if external.Clicked() {
				_ = mygo.Shell.OpenExternal(rawURL(p))
			}
			download := iconButton(c, iconDownload, "下载", "下载文件", false)
			if download.Clicked() {
				_ = mygo.Shell.OpenExternal(downloadURL(p))
			}
		})

		ui.Row(c).Grow(1).Children(func() {
			a.playerStage(c, state)
			width, _ := c.Size()
			if len(state.playlist) > 0 && width >= 900 {
				a.playlistPanel(c, state)
			}
		})

		a.playerControls(c, state)
	})
}

func (a *app) ensurePlayer(p string) {
	state := &a.player
	if state.path == p {
		return
	}

	previousDirectory := state.directory
	state.close()
	state.path = p
	state.kind = mediaKind(p)
	state.directory = parentOf(p)
	state.loading = true
	state.err = ""
	state.handledEnd = false
	state.audioEnded = false

	if previousDirectory != state.directory {
		a.loadPlaylist(state.directory)
	}

	switch state.kind {
	case "video":
		player, err := video.OpenURL(rawURL(p))
		if err != nil {
			state.loading = false
			state.err = err.Error()
			return
		}
		player.SetVolume(state.volume).SetMuted(state.muted).SetRate(state.rate).SetLoop(state.loop)
		state.video = player
		state.loading = false
	case "audio":
		go func() {
			data, err := fetchBytes(rawURL(p))
			a.win.Update(func() {
				if state.path != p {
					return
				}
				state.loading = false
				if err != nil {
					state.err = err.Error()
					return
				}
				player, err := audio.OpenStream(bytes.NewReader(data))
				if err != nil {
					state.err = "无法解码该音频"
					return
				}
				player.SetVolume(state.volume).SetLoop(state.loop).SetSpeed(state.rate)
				state.audio = player
				state.audioOff = player.OnEnd(func() {
					a.win.Update(func() {
						state.audioEnded = true
					})
				})
			})
		}()
	default:
		state.loading = false
		state.err = "不支持播放该文件"
	}
}

func (a *app) loadPlaylist(directory string) {
	state := &a.player
	state.playlist = nil

	go func() {
		result, err := fetchList(directory)
		a.win.Update(func() {
			if state.directory != directory {
				return
			}
			if err != nil {
				return
			}
			items := make([]mediaItem, 0, len(result.Entries))
			for _, entry := range result.Entries {
				if isDirEntry(entry) || mediaKind(entry.Name) == "" {
					continue
				}
				items = append(items, mediaItem{
					entry: entry,
					path:  joinPath(directory, entry.Name),
				})
			}
			sort.SliceStable(items, func(i, j int) bool {
				return strings.ToLower(items[i].entry.Name) < strings.ToLower(items[j].entry.Name)
			})
			state.playlist = items
		})
	}()
}

func (a *app) playOffset(offset int) {
	state := &a.player
	if len(state.playlist) == 0 {
		return
	}
	index := state.indexOf(state.path)
	if index < 0 {
		return
	}
	next := index + offset
	if state.loop {
		next = (next%len(state.playlist) + len(state.playlist)) % len(state.playlist)
	}
	if next < 0 || next >= len(state.playlist) {
		return
	}
	a.router.Push(playRoute(state.playlist[next].path))
}

func (a *app) playNextAfterEnd() {
	state := &a.player
	index := state.indexOf(state.path)
	if index < 0 || index+1 >= len(state.playlist) {
		return
	}
	a.router.Push(playRoute(state.playlist[index+1].path))
}

func (a *app) playerStage(c *ui.Context, state *playerState) {
	theme := c.Theme()

	switch {
	case state.kind == "video":
		ui.Box(c).Grow(1).FillHeight().Background(ui.Hex("#000000")).Children(func() {
			switch {
			case state.loading:
				ui.Column(c).Fill().Center().Children(func() {
					ui.Text(c, "加载中…").TextColor(ui.Hex("#ffffff"))
				})
			case state.err != "":
				a.stageError(c, state)
			case state.video != nil:
				ui.Video(c, state.video).Fill().Fit(ui.Contain)
			}
		})
	default:
		ui.Column(c).Grow(1).FillHeight().Background(theme.Background).Center().Gap(10).Padding(20).Children(func() {
			switch {
			case state.loading:
				ui.Text(c, "加载中…").TextColor(theme.TextMuted)
			case state.err != "":
				a.stageError(c, state)
			case state.audio != nil:
				ui.Icon(c, iconMusic).FontSize(72).TextColor(theme.Accent)
				ui.Text(c, baseName(state.path)).FontSize(16).SingleLine()
				ui.Text(c, "音频").FontSize(12).TextColor(theme.TextMuted)
			}
		})
	}
}

func (a *app) stageError(c *ui.Context, state *playerState) {
	ui.Column(c).Fill().Center().Gap(8).Children(func() {
		ui.Text(c, state.err).TextColor(c.Theme().Danger)
		if ui.Button(c, "下载文件").Clicked() {
			_ = mygo.Shell.OpenExternal(downloadURL(state.path))
		}
	})
}

func (a *app) playlistPanel(c *ui.Context, state *playerState) {
	theme := c.Theme()

	ui.Column(c).Width(260).FillHeight().Background(theme.Surface).Children(func() {
		ui.Text(c, "播放列表").
			Padding(8, 12).
			FontSize(12).
			TextColor(theme.TextMuted)

		ui.List(c, nil, len(state.playlist), func(index int) {
			item := state.playlist[index]
			current := item.path == state.path

			row := ui.ButtonBase(c).Padding(7, 10).Children(func() {
				ui.Row(c).Gap(6).AlignItems(ui.Center).Children(func() {
					ui.Icon(c, entryIcon(item.entry)).FontSize(14)
					ui.Text(c, item.entry.Name).SingleLine().FontSize(12)
				})
			})
			if current {
				row.Background(theme.Accent)
				row.TextColor(theme.AccentText)
			}
			row.OnClick(func() {
				if item.path != state.path {
					a.router.Push(playRoute(item.path))
				}
			})
		}).Grow(1)
	})
}

func (a *app) playerControls(c *ui.Context, state *playerState) {
	theme := c.Theme()

	if state.err != "" || state.loading || (state.video == nil && state.audio == nil) {
		return
	}

	duration := state.duration().Seconds()
	position := state.position().Seconds()
	if duration < 0 {
		duration = 0
	}
	if position < 0 {
		position = 0
	}

	volume := state.volume
	if state.muted {
		volume = 0
	}

	ui.Column(c).Padding(10, 12).Gap(4).Children(func() {
		ui.Row(c).Gap(8).AlignItems(ui.Center).Children(func() {
			ui.Text(c, formatDuration(position)).FontSize(11).TextColor(theme.TextMuted)
			if ui.Slider(c, &position, 0, math.Max(duration, 0.1)).
				Label("播放进度").
				Grow(1).
				Changed() {
				state.seek(time.Duration(position * float64(time.Second)))
			}
			ui.Text(c, formatDuration(duration)).FontSize(11).TextColor(theme.TextMuted)
		})

		ui.Row(c).Gap(6).AlignItems(ui.Center).Wrap().Children(func() {
			if iconButton(c, iconPrev, "上一个", "上一个", len(state.playlist) < 2).Clicked() {
				a.playOffset(-1)
			}

			playIcon := iconPlay
			playLabel := "播放"
			if state.playing() {
				playIcon = iconPause
				playLabel = "暂停"
			}
			play := ui.PrimaryButton(c, "").Label(playLabel)
			play.Children(func() {
				ui.Icon(c, playIcon).FontSize(20)
			})
			if play.Clicked() {
				state.toggle()
			}

			if iconButton(c, iconNext, "下一个", "下一个", len(state.playlist) < 2).Clicked() {
				a.playOffset(1)
			}

			width, _ := c.Size()
			if width >= 640 {
				ui.Spacer(c)
			}

			ui.Toggle(c, &state.loop, "循环").Label("循环播放")

			rate := ui.Button(c, fmt.Sprintf("%gx", state.rate)).Label("播放速度")
			if rate.Clicked() {
				state.cycleRate()
			}

			muteIcon := iconVolume
			muteLabel := "静音"
			if state.muted {
				muteIcon = iconMute
				muteLabel = "取消静音"
			}
			if iconButton(c, muteIcon, muteLabel, muteLabel, false).Clicked() {
				state.toggleMute()
			}
			if width, _ := c.Size(); width >= 640 {
				if ui.Slider(c, &volume, 0, 1).Label("音量").Width(90).Changed() {
					state.setVolume(volume)
				}
			}
		})
	})
}

func formatDuration(seconds float64) string {
	if math.IsNaN(seconds) || math.IsInf(seconds, 0) || seconds < 0 {
		seconds = 0
	}
	total := int(math.Floor(seconds))
	minutes := total / 60
	remaining := total % 60
	return fmt.Sprintf("%d:%02d", minutes, remaining)
}

func mediaKindLabel(kind string) string {
	switch kind {
	case "video":
		return "视频"
	case "audio":
		return "音频"
	default:
		return "媒体"
	}
}
